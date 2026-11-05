// dsh-turbo-native: Zero-dependency Rust native accelerator for macOS
// Provides:
// 1. `check-ax`   : Fast macOS Accessibility trust check via ApplicationServices FFI (<0.2ms)
// 2. `prompt-ax`  : Triggers macOS native Accessibility authorization dialog + opens System Settings
// 3. `fast-scan`  : Sub-millisecond brain directory mtime/size scanner for Antigravity IDE & DSH
// 4. `send-key`   : Native CoreGraphics CGEvent keyboard injector (<1ms, replaces slow osascript)

use std::env;
use std::ffi::c_void;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: *const c_void) -> bool;
    static kAXTrustedCheckOptionPrompt: *const c_void;

    fn CGEventCreateKeyboardEvent(
        source: *const c_void,
        virtual_key: u16,
        key_down: bool,
    ) -> *mut c_void;
    fn CGEventSetFlags(event: *mut c_void, flags: u64);
    fn CGEventPost(tap: u32, event: *mut c_void);
}

#[cfg(target_os = "macos")]
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFBooleanTrue: *const c_void;
    static kCFTypeDictionaryKeyCallBacks: c_void;
    static kCFTypeDictionaryValueCallBacks: c_void;

    fn CFDictionaryCreate(
        allocator: *const c_void,
        keys: *const *const c_void,
        values: *const *const c_void,
        num_values: isize,
        key_callbacks: *const c_void,
        value_callbacks: *const c_void,
    ) -> *const c_void;
    fn CFRelease(cf: *const c_void);
}

// macOS CGEventFlags constants
const K_CG_EVENT_FLAG_MASK_SHIFT: u64 = 0x0002_0000;
const K_CG_EVENT_FLAG_MASK_ALTERNATE: u64 = 0x0008_0000;
const K_CG_HID_EVENT_TAP: u32 = 0;

// macOS Virtual KeyCodes
const KEY_1: u16 = 18;
const KEY_2: u16 = 19;
const KEY_3: u16 = 20;
const KEY_4: u16 = 21;
const KEY_RETURN: u16 = 36;
const KEY_ESCAPE: u16 = 53;

#[cfg(target_os = "macos")]
fn check_accessibility(prompt: bool) -> bool {
    unsafe {
        if !prompt {
            return AXIsProcessTrusted();
        }
        let keys = [kAXTrustedCheckOptionPrompt];
        let values = [kCFBooleanTrue];
        let dict = CFDictionaryCreate(
            std::ptr::null(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks,
        );
        let trusted = AXIsProcessTrustedWithOptions(dict);
        if !dict.is_null() {
            CFRelease(dict);
        }
        if !trusted {
            let _ = Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                .status();
        }
        trusted
    }
}

#[cfg(not(target_os = "macos"))]
fn check_accessibility(_prompt: bool) -> bool {
    true
}

#[cfg(target_os = "macos")]
fn post_key(virtual_key: u16, flags: u64) -> bool {
    unsafe {
        let down = CGEventCreateKeyboardEvent(std::ptr::null(), virtual_key, true);
        if down.is_null() {
            return false;
        }
        if flags != 0 {
            CGEventSetFlags(down, flags);
        }
        CGEventPost(K_CG_HID_EVENT_TAP, down);
        CFRelease(down);

        thread::sleep(Duration::from_millis(12));

        let up = CGEventCreateKeyboardEvent(std::ptr::null(), virtual_key, false);
        if !up.is_null() {
            if flags != 0 {
                CGEventSetFlags(up, flags);
            }
            CGEventPost(K_CG_HID_EVENT_TAP, up);
            CFRelease(up);
        }
        true
    }
}

#[cfg(not(target_os = "macos"))]
fn post_key(_virtual_key: u16, _flags: u64) -> bool {
    false
}

fn focus_antigravity_ide() {
    let _ = Command::new("osascript")
        .arg("-e")
        .arg(r#"tell application "System Events" to set frontmost of first process whose (name contains "Antigravity" or name contains "Electron") to true"#)
        .output();
    thread::sleep(Duration::from_millis(60));
}

fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {}
            c => out.push(c),
        }
    }
    out
}

struct ScanEntry {
    conv_id: String,
    path: String,
    mtime_ms: u128,
    size: u64,
}

fn scan_brain_dirs(dirs: &[String], max_items: usize) -> Vec<ScanEntry> {
    let mut items: Vec<ScanEntry> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for dir_str in dirs {
        let root = Path::new(dir_str);
        let read_dir = match fs::read_dir(root) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for entry_res in read_dir {
            let entry = match entry_res {
                Ok(e) => e,
                Err(_) => continue,
            };
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };
            if !file_type.is_dir() {
                continue;
            }
            let conv_id = entry.file_name().to_string_lossy().to_string();
            if conv_id.starts_with('.') || conv_id == "tempmediaStorage" || seen.contains(&conv_id) {
                continue;
            }
            let logs_dir: PathBuf = entry.path().join(".system_generated").join("logs");
            let candidates = [
                logs_dir.join("transcript.jsonl"),
                logs_dir.join("transcript_full.jsonl"),
            ];
            for cand in &candidates {
                if let Ok(meta) = fs::metadata(cand) {
                    if meta.is_file() && meta.len() > 20 {
                        let mtime_ms = meta
                            .modified()
                            .ok()
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_millis())
                            .unwrap_or(0);
                        seen.insert(conv_id.clone());
                        items.push(ScanEntry {
                            conv_id,
                            path: cand.to_string_lossy().to_string(),
                            mtime_ms,
                            size: meta.len(),
                        });
                        break;
                    }
                }
            }
        }
    }

    items.sort_by(|a, b| b.mtime_ms.cmp(&a.mtime_ms));
    if items.len() > max_items {
        items.truncate(max_items);
    }
    items
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let cmd = args.get(1).map(|s| s.as_str()).unwrap_or("version");

    match cmd {
        "check-ax" => {
            let trusted = check_accessibility(false);
            println!(
                r#"{{"ok":true,"trusted":{},"engine":"rust-native","version":"2.0.0","arch":"{}"}}"#,
                trusted,
                env::consts::ARCH
            );
        }
        "prompt-ax" => {
            let trusted = check_accessibility(true);
            println!(
                r#"{{"ok":true,"trusted":{},"prompted":true,"engine":"rust-native","version":"2.0.0"}}"#,
                trusted
            );
        }
        "fast-scan" => {
            let start = SystemTime::now();
            let dirs: Vec<String> = args.iter().skip(2).cloned().collect();
            let entries = scan_brain_dirs(&dirs, 40);
            let elapsed_us = start.elapsed().map(|d| d.as_micros()).unwrap_or(0);
            let mut json_items = Vec::with_capacity(entries.len());
            for e in entries {
                json_items.push(format!(
                    r#"{{"convId":"{}","path":"{}","mtimeMs":{},"size":{}}}"#,
                    json_escape(&e.conv_id),
                    json_escape(&e.path),
                    e.mtime_ms,
                    e.size
                ));
            }
            println!(
                r#"{{"ok":true,"engine":"rust-native","elapsedUs":{},"items":[{}]}}"#,
                elapsed_us,
                json_items.join(",")
            );
        }
        "send-key" => {
            let action = args.get(2).map(|s| s.as_str()).unwrap_or("approve-1");
            if !check_accessibility(false) {
                println!(r#"{{"ok":false,"error":"ACCESSIBILITY_NOT_GRANTED","engine":"rust-native"}}"#);
                std::process::exit(2);
            }
            focus_antigravity_ide();
            let ok = match action {
                "approve-1" => {
                    post_key(KEY_1, 0);
                    thread::sleep(Duration::from_millis(35));
                    post_key(KEY_RETURN, 0)
                }
                "approve-2" => {
                    post_key(KEY_2, 0);
                    thread::sleep(Duration::from_millis(35));
                    post_key(KEY_RETURN, 0)
                }
                "approve-3" => {
                    post_key(KEY_3, 0);
                    thread::sleep(Duration::from_millis(35));
                    post_key(KEY_RETURN, 0)
                }
                "deny-4" => {
                    post_key(KEY_4, 0);
                    thread::sleep(Duration::from_millis(35));
                    post_key(KEY_ESCAPE, 0)
                }
                "opt-enter" => post_key(KEY_RETURN, K_CG_EVENT_FLAG_MASK_ALTERNATE),
                "opt-shift-enter" => post_key(
                    KEY_RETURN,
                    K_CG_EVENT_FLAG_MASK_ALTERNATE | K_CG_EVENT_FLAG_MASK_SHIFT,
                ),
                "escape" => post_key(KEY_ESCAPE, 0),
                "enter" => post_key(KEY_RETURN, 0),
                _ => false,
            };
            println!(
                r#"{{"ok":{},"action":"{}","engine":"rust-native"}}"#,
                ok,
                json_escape(action)
            );
        }
        _ => {
            println!(
                r#"{{"ok":true,"name":"dsh-turbo-native","engine":"rust-native","version":"2.0.0","arch":"{}","os":"{}"}}"#,
                env::consts::ARCH,
                env::consts::OS
            );
        }
    }
}
