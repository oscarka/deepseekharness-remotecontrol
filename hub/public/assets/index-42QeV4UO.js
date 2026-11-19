// \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
// node_modules/.pnpm/preact@11.1.1/node_modules/preact/dist/preact.mjs
var n;
var t;
var i;
var u;
var f;
var e;
var o;
var l;
var c;
var a;
var h = Symbol.for("pv");
var p = {};
var v = [];
var y = /^m(i|n|o|s|text|space)$/;
var w = Array.isArray;
var d = v.slice;
var _ = Object.assign;
function g(n) {
	n && n.parentNode && n.remove();
}
function k(n, t, r) {
	var i, u, f, e = {}, o = arguments.length;
	for (f in t) "key" == f ? i = t[f] : "ref" == f && "function" != typeof n ? u = t[f] : e[f] = t[f];
	return o > 2 && (e.children = o > 3 ? d.call(arguments, 2) : r), m(n, e, i, u, null);
}
function m(r, i, u, f, e) {
	var o = {
		type: r,
		props: i,
		key: u,
		ref: f,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: h,
		__v: e || ++t,
		__i: -1,
		__u: 0
	};
	return !e && n.vnode && n.vnode(o), o;
}
function M(n) {
	return n.children;
}
function x(n, t) {
	this.props = n, this.context = t, this.__g = 0;
}
function S(n, t) {
	if (null == t) return n.__ && S(n.__, n.__i + 1);
	for (var r; t < n.__k.length; t++) if ((r = n.__k[t]) && r.__e) return r.__e;
	return "function" != typeof n.type || n.props.__P ? null : S(n);
}
function C(n) {
	if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
		return t && (n.__e = t.__e);
	}), C(n);
}
function j(t) {
	(8 & t.__g || (t.__g |= 8, i.push(t), f++)) && u == n.debounceRendering || ((u = n.debounceRendering) || queueMicrotask)(L);
}
function L() {
	var t, r, o, l, c, a, s, p, v;
	try {
		for (r = 1; i.length;) i.length > r && i.sort(e), t = i.shift(), r = i.length, 8 & t.__g && (l = void 0, c = void 0, a = (c = (o = t).__v).__e, s = [], p = [], (v = o.__P) && ((l = _({ constructor: h }, c)).__v = c.__v + 1, n.vnode && n.vnode(l), V(v, l, c, o.__n, v.namespaceURI, 32 & c.__u ? [a] : null, s, a || S(c), 32 & c.__u, p), l.__v = c.__v, l.__.__k[l.__i] = l, D(s, l, p), c.__ = c.__e = null, l.__e != a && C(l)));
	} finally {
		(f = i.length) && (u || queueMicrotask)(L);
	}
}
function H(n, t, r, i, u, f, e, o, l, c, a) {
	var s, h, y, w, d, _, g = i.__k || v, k = t.length;
	for (l = I(r, t, g, l, k), s = 0; s < k; s++) null != (y = r.__k[s]) && (h = ~y.__i && g[y.__i] || p, y.__i = s, _ = V(n, y, h, u, f, e, o, l, c, a), w = y.__e, (h.ref != y.ref || 8 & h.__u) && (h.ref && F(h.ref, null, y, h), y.ref && a.push(y.ref, y.__c || w, y)), d = d || w, 4 & y.__u ? (l = q(y, l, n, !h.__v), h.__e && (h.__e = null)) : "function" == typeof y.type && void 0 !== _ ? l = _ : w && (l = w.nextSibling), y.__u &= -21);
	return r.__e = d, l;
}
function I(n, t, r, i, u) {
	var f, e, o, l, c, a, s, p, v, y = r.length, d = y, _ = 0, g = 0, k = n.__k = Array(u);
	for (f = 0; f < u; f++) null != (e = t[f]) && "boolean" != typeof e && "function" != typeof e ? ("object" != typeof e || e.constructor === String ? e = k[f] = m(null, e) : w(e) ? e = k[f] = m(M, { children: e }) : e.constructor === h && e.__b ? e = k[f] = m(e.type, e.props, e.key, e.ref, e.__v) : k[f] = e, l = f + _, e.__ = n, e.__b = n.__b + 1, o = null, ~(c = e.__i = O(e, r, l, d)) && (d--, (o = r[c]) && (o.__u |= 2)), o && o.__v ? (e.__u |= 16, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = 1)) : (~c || (u > y ? _-- : u < y && _++), "function" != typeof e.type && (e.__u |= 4))) : k[f] = null;
	if (g) {
		for (a = [], s = [], f = 0; f < u; f++) if ((e = k[f]) && 16 & e.__u) {
			for (_ = 0, p = a.length; _ < p;) a[v = _ + p >> 1] < e.__i ? _ = v + 1 : p = v;
			a[_] = e.__i, s[f] = _ + 1;
		}
		for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
	}
	if (d) for (f = 0; f < y; f++) !(o = r[f]) || 2 & o.__u || (o.__e == i && (i = S(o)), G(o, o));
	return i;
}
function q(n, t, r, i) {
	var u, f, e, o;
	if ("function" == typeof n.type) {
		if (n.props.__P) return t;
		if (u = n.__k) for (f = 0; f < u.length; f++) u[f] && (u[f].__ = n, t = q(u[f], t, r, !1));
		return t;
	}
	for (t && !t.parentNode && (t = S(n)) && !t.parentNode && (t = null), e = n.__e, o = t; o && 8 == o.nodeType;) o = o.nextSibling;
	for (e != o && (!i && r.moveBefore && e.parentNode ? r.moveBefore(e, t) : r.insertBefore(e, t || null)), t = e; (t = t && t.nextSibling) && 8 == t.nodeType && !t.data.startsWith("$s"););
	return t;
}
function O(n, t, r, i) {
	var u, f = n.key, e = n.type, o = t[r], l = o && !(2 & o.__u);
	if (null === o && null == f || l && f == o.key && e == o.type) return r;
	if (i > (l ? 1 : 0)) {
		for (u = r - 1; u >= 0; u--) if ((o = t[u]) && !(2 & o.__u) && f == o.key && e == o.type) return u;
		for (u = r + 1; u < t.length; u++) if ((o = t[u]) && !(2 & o.__u) && f == o.key && e == o.type) return u;
	}
	return -1;
}
function P(n, t, r) {
	r ??= "", "-" == t[0] ? n.setProperty(t, r) : n[t] = r;
}
function T(n, t, r, i, u) {
	var f, e;
	if ("style" == t) if ("string" == typeof r) n.style.cssText = r;
	else {
		if ("string" == typeof i && (n.style.cssText = i = ""), i) for (t in i) r && t in r || P(n.style, t);
		if (r) for (t in r) i && r[t] == i[t] || P(n.style, t, r[t]);
	}
	else if ("o" == t[0] && "n" == t[1]) (n.__e || (n.__e = {}))[t] = r, r && i || (e = a[t] || (a[t] = N(t)), (n.__a || (n.__a = {}))[t] = c, f = t != (t = t.replace(l, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), r ? n.addEventListener(t, e, f) : n.removeEventListener(t, e, f));
	else {
		if ("http://www.w3.org/2000/svg" == u) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
		else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
			n[t] = null == r ? "" : r;
			return;
		} catch (n) {}
		if ("function" == typeof r) return;
		null == r || !1 === r && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == r ? "" : r);
	}
}
function N(t) {
	return function(r) {
		var i = this.__e;
		if (i) {
			if (i = i[t], null == r[o]) r[o] = c++;
			else if (r[o] < this.__a[t]) return;
			return i(n.event ? n.event(r) : r);
		}
	};
}
function V(t, r, i, u, f, e, o, l, c, a) {
	var s, p, y, d, k, b, m, $, C, j, L, I, q, A, O, P, T, N, V = r.type;
	if (r.constructor !== h) return null;
	128 & i.__u && (c = 32 & i.__u, s = i.__c.__z) && (r.__u |= c, p = e = [], 8 == s.nodeType ? l = z(s, e) : e.push(s), l = e[0] || l), (s = n.__b) && s(r);
	n: if ("function" == typeof V) {
		y = o.length;
		try {
			if ($ = r.props, C = (s = V.prototype) && s.render, j = (s = V.contextType) && u[s.__c], L = s ? j ? j.props.value : s.__ : u, (d = i.__c) ? (r.__c = d, 2 & d.__g && (d.__g |= 1)) : (C ? r.__c = d = new V($, L) : (r.__c = d = new x($, L), d.constructor = V, d.render = J), j && j.sub(d), d.state || (d.state = {}), d.__n = u, d.__g |= 8, d.__h = [], d.__k = []), C && (d.__s || (d.__s = d.state), V.getDerivedStateFromProps && (d.__s == d.state && (d.__s = _({}, d.__s)), _(d.__s, V.getDerivedStateFromProps($, d.__s)))), k = d.props, b = d.state, d.__v = r, i.__c) {
				if ($ !== k && C && !V.getDerivedStateFromProps && d.componentWillReceiveProps && d.componentWillReceiveProps($, L), r.__v == i.__v && !(8 & d.__g) || !(4 & d.__g) && d.shouldComponentUpdate && !1 === d.shouldComponentUpdate($, d.__s, L)) {
					r.__v != i.__v && (d.props = $, d.state = d.__s, d.__g &= -9), r.__e = i.__e, r.__k = i.__k, r.__k.some(function(n) {
						n && (n.__ = r);
					}), v.push.apply(d.__h, d.__k), d.__k = [], d.__h.length && o.push(d), l = S(i);
					break n;
				}
				d.componentWillUpdate && d.componentWillUpdate($, d.__s, L), C && d.componentDidUpdate && d.__h.push(function() {
					d.componentDidUpdate(k, b, m);
				});
			} else C && !V.getDerivedStateFromProps && d.componentWillMount && d.componentWillMount(), C && d.componentDidMount && d.__h.push(d.componentDidMount);
			if (d.context = L, d.props = $, d.__P = t, d.__g &= -5, I = n.__r, q = 0, C) d.state = d.__s, d.__g &= -9, I && I(r), s = d.render(d.props, d.state, d.context), v.push.apply(d.__h, d.__k), d.__k = [];
			else do
				d.__g &= -9, I && I(r), s = d.render(d.props, d.state, d.context), d.state = d.__s;
			while (8 & d.__g && ++q < 25);
			d.state = d.__s, d.getChildContext && (u = _({}, u, d.getChildContext())), C && i.__c && d.getSnapshotBeforeUpdate && (m = d.getSnapshotBeforeUpdate(k, b)), A = s && s.type === M && null == s.key ? s.props.children : s, $.__P && (s = l, f = (t = $.__P).namespaceURI, c = e = null, i.props && i.props.__P != t && (i.__k.some(function(n) {
				n && G(n, n);
			}), i.__k = null), l = i.__k ? S(i, 0) : null), l = H(t, w(A) ? A : [A], r, i, u, f, e, o, l, c, a), $.__P && (r.__e = null, l = s), r.__u &= -161, p && p.some(g), d.__h.length && o.push(d), 1 & d.__g && (d.__g &= -4);
		} catch (t) {
			if (o.length = y, r.__v = null, c || e) if (t.then) {
				if (O = 0, r.__u |= 128 | c, e) {
					for (~(T = e.indexOf(l || void 0)) || (T = e.length); (N = e[T - 1]) && 8 == N.nodeType;) T--;
					for (; T < e.length; T++) if (N = e[T]) {
						if (e[T] = null, 8 == N.nodeType) {
							if (N.data.startsWith("$s")) O++ || (P = N);
							else if (O && N.data.startsWith("/$s") && !--O) break;
						} else if (!O) break;
					}
				}
				if (!P) {
					for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
					P = l;
				}
				(s = z(P = r.__c.__z || (r.__c.__z = P))) ? (r.__e = P, l = s) : r.__e = l, l = l && l.nextSibling;
			} else e && e.some(g);
			else r.__e = i.__e;
			r.__k || (r.__k = i.__k || []), t.then || B(r), n.__e(t, r, i);
		}
	} else l = r.__e = E(i.__e, r, i, u, f, e, o, c, a, t);
	return (s = n.diffed) && s(r), l;
}
function z(n, t) {
	if (n && 8 == n.nodeType && n.data.startsWith("$s")) for (var r = 1; n = n.nextSibling;) {
		if (8 == n.nodeType) {
			if (n.data.startsWith("$s")) r++;
			else if (n.data.startsWith("/$s") && !--r) return n;
		}
		t && t.push(n);
	}
}
function B(n) {
	n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(B));
}
function D(t, r, i) {
	for (var u = 0; u < i.length;) F(i[u++], i[u++], i[u++]);
	n.__c && n.__c(r, t), t.some(function(r) {
		try {
			t = r.__h, r.__h = [], t.some(function(n) {
				n.call(r);
			});
		} catch (t) {
			n.__e(t, r.__v);
		}
	});
}
function E(t, r, i, u, f, e, o, l, c, a) {
	var s, h, v, _, k, b, m, $, M, x = i.props || p, C = r.props, j = r.type;
	if ("svg" == j ? f = "http://www.w3.org/2000/svg" : "math" == j ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), e) {
		for (s = 0; s < e.length; s++) if ((k = e[s]) && (j ? k.localName == j : 3 == k.nodeType)) {
			t = k, e[s] = null;
			break;
		}
	}
	if (!t) {
		if ($ = a.ownerDocument || document, !j) return $.createTextNode(C);
		t = $.createElementNS(f, j, C.is && C), l && (n.__m && n.__m(r, e), l = !1), e = null;
	}
	if (j) {
		if (a = "template" == j && t.content || t, e = "textarea" == j && null != C.defaultValue ? null : e && d.call(a.childNodes), !l && e) for (x = {}, s = 0; s < t.attributes.length; s++) x[(k = t.attributes[s]).name] = k.value;
		for (s in x) k = x[s], "dangerouslySetInnerHTML" == s ? v = k : "children" == s || s in C || "value" == s && "defaultValue" in C || "checked" == s && "defaultChecked" in C || T(t, s, null, k, f);
		for (s in M = 1 & i.__u, C) k = C[s], "children" == s ? _ = k : "dangerouslySetInnerHTML" == s ? h = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || !(x[s] !== k || M && null != k) || T(t, s, k, x[s], f);
		h ? (l || v && (h.__html == v.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), r.__k = []) : (v && (t.textContent = ""), ("foreignObject" == j || "http://www.w3.org/1998/Math/MathML" == f && y.test(j)) && (f = "http://www.w3.org/1999/xhtml"), H(a, w(_) ? _ : [_], r, i, u, f, e, o, e ? e[0] : i.__k && S(i, 0), l, c), e && e.some(g)), l && "textarea" != j || (s = "value", "progress" == j && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != j || b) || T(t, s, b, x[s], f), s = "checked", null != m && m != t[s] && T(t, s, m, x[s], f));
	} else x === C || l && t.data == C || (t.data = C);
	return t;
}
function F(t, r, i, u) {
	try {
		"function" == typeof t ? r ? r.__x = t(r) || 1 : u && (u = u.__c || u.__e) && (r = u.__x) && (u.__x = null, "function" == typeof r ? r() : t(null)) : t.current = r;
	} catch (t) {
		n.__e(t, i);
	}
}
function G(t, r, i) {
	var u, f, e, o;
	if (n.unmount && n.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || F(u, null, r, t), u = t.__c) {
		if (u.componentWillUnmount) try {
			u.componentWillUnmount();
		} catch (t) {
			n.__e(t, r);
		}
		u.__P = u.__n = null;
	}
	if (u = t.__k) for (o = 0; o < u.length; o++) u[o] && G(u[o], r, "function" != typeof t.type || i && !t.props.__P);
	!i && (u = t.__c) && (u = u.__z) && (f = z(u, e = [])) && (u == t.__e && e.some(g), g(f), g(u)), (u = t.__e) && (i || g(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
}
function J(n, t, r) {
	return this.constructor(n, r);
}
function K(t, r) {
	var i, u, f, e;
	n.__ && n.__(t, r), 9 == r.nodeType && (r = r.documentElement), u = (i = t && 32 & t.__u) ? null : r.__k, r.__k = m(M, { children: [t] }), f = [], e = [], V(r, r.__k, u || p, p, r.namespaceURI, u ? null : r.firstChild ? d.call(r.childNodes) : null, f, u ? u.__e : r.firstChild, i, e), D(f, r.__k, e), r.__k.props.children = null;
}
n = { __e: function(n, t, r, i) {
	for (var u, e, o; t = t.__;) if ((u = t.__c) && !(1 & u.__g)) {
		u.__g |= 4;
		try {
			if ((o = (e = u.constructor) && e.getDerivedStateFromError) && u.setState(e.getDerivedStateFromError(n)), u.componentDidCatch && (u.componentDidCatch(n, i || {}), o = 1), o && 8 & u.__g) return void (u.__g |= 2);
		} catch (t) {
			n = t;
		}
	}
	throw f = 0, n;
} }, t = 0, x.prototype.setState = function(n, t) {
	var r = this.__s;
	r && r != this.state || (r = this.__s = _({}, this.state)), "function" == typeof n && (n = n(_({}, r), this.props)), n && (_(r, n), this.__v && (t && this.__k.push(t), j(this)));
}, x.prototype.forceUpdate = function(n) {
	this.__v && (this.__g |= 4, n && this.__h.push(n), j(this));
}, x.prototype.render = M, i = [], f = 0, e = function(n, t) {
	return n.__v.__b - t.__v.__b;
}, o = Symbol(), l = /(PointerCapture)$|Capture$/i, c = 0, a = {};
// hub/web/src/components/TopBar.tsx
function TopBar() {
	return /* @__PURE__ */ k(M, null, /* @__PURE__ */ k("header", {
		class: "top-bar",
		id: "mobileTopHostBtn"
	}, /* @__PURE__ */ k("div", { class: "top-bar-left" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "host-switcher-btn",
		onClick: () => window.openHostSheet?.()
	}, /* @__PURE__ */ k("span", {
		class: "status-dot",
		id: "topHostDot"
	}), /* @__PURE__ */ k("span", {
		class: "host-switcher-name",
		id: "topHostName"
	}, "连接中..."), /* @__PURE__ */ k("span", { class: "host-switcher-caret" }, "▾")), /* @__PURE__ */ k("button", {
		type: "button",
		id: "turboBadgeBtn",
		onClick: () => window.openTurboGuideSheet?.(),
		style: "border:1px solid #a7f3d0;background:#ecfdf5;color:#059669;border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;"
	}, "⚡ 极速")), /* @__PURE__ */ k("div", { style: "display:flex;align-items:center;gap:6px;flex-shrink:0;" }, /* @__PURE__ */ k("button", {
		type: "button",
		"data-lang-toggle": "1",
		onClick: () => window.toggleLangPreference?.(),
		style: "border:1px solid var(--border);background:var(--subtle);color:var(--text-secondary);border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;"
	}, "🌐 EN"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "new-chat-btn",
		onClick: () => window.openNewTaskSheet?.()
	}, /* @__PURE__ */ k("span", null, "＋"), /* @__PURE__ */ k("span", null, "新建对话")))), /* @__PURE__ */ k("div", {
		id: "connectionStatusBanner",
		class: "connection-status-banner",
		style: "display:none;",
		onClick: () => window.manualReconnectNow?.()
	}, /* @__PURE__ */ k("span", null, "⚠️ 网络连接中断，正在自动重连…"), /* @__PURE__ */ k("span", { style: "text-decoration:underline;margin-left:6px;font-weight:700;" }, "点此立即重试")), /* @__PURE__ */ k("div", {
		class: "search-and-filter",
		id: "searchAndFilterBox"
	}, /* @__PURE__ */ k("div", { class: "search-box-wrap" }, /* @__PURE__ */ k("div", { class: "search-box" }, /* @__PURE__ */ k("span", { style: "font-size:13px;color:#94a3b8;" }, "🔍"), /* @__PURE__ */ k("input", {
		id: "searchInput",
		placeholder: "搜索对话标题、项目或内容...",
		onInput: () => window.onSearchInput?.()
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "search-clear",
		id: "searchClearBtn",
		onClick: () => window.clearSearch?.()
	}, "✕"))), /* @__PURE__ */ k("nav", {
		class: "filter-strip",
		id: "projectStrip"
	})));
}
// hub/web/src/components/BottomTabs.tsx
function BottomTabs() {
	return /* @__PURE__ */ k("footer", { class: "bottom-tabs" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "tab-btn active",
		id: "tab-chats",
		onClick: () => window.switchTab?.("chats")
	}, /* @__PURE__ */ k("span", { class: "icon" }, "💬"), /* @__PURE__ */ k("span", null, "对话")), /* @__PURE__ */ k("button", {
		type: "button",
		class: "tab-btn",
		id: "tab-files",
		onClick: () => window.switchTab?.("files")
	}, /* @__PURE__ */ k("span", { class: "icon" }, "📂"), /* @__PURE__ */ k("span", null, "项目文件")), /* @__PURE__ */ k("button", {
		type: "button",
		class: "tab-btn",
		id: "tab-settings",
		onClick: () => window.switchTab?.("settings")
	}, /* @__PURE__ */ k("span", { class: "icon" }, "⚙️"), /* @__PURE__ */ k("span", null, "设备与设置")));
}
// hub/web/src/components/TriageDeck.tsx
function TriageDeck() {
	return /* @__PURE__ */ k("section", {
		class: "dsh-triage-overlay",
		id: "triageDeckOverlay",
		"aria-label": "滑卡批阅模式"
	}, /* @__PURE__ */ k("div", {
		class: "dsh-triage-drag-pill",
		id: "triageDragPill"
	}), /* @__PURE__ */ k("header", { class: "dsh-triage-topbar" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "dsh-triage-top-pill",
		id: "triageUndoBtn",
		disabled: true,
		onClick: () => window.triageUndoLast?.()
	}, "↩ 撤回"), /* @__PURE__ */ k("div", { class: "dsh-triage-center-title" }, /* @__PURE__ */ k("span", { id: "triageCenterTitleText" }, "滑卡批阅"), /* @__PURE__ */ k("span", {
		class: "dsh-triage-count-chip",
		id: "triageCountChip"
	}, "0")), /* @__PURE__ */ k("button", {
		type: "button",
		class: "dsh-triage-top-pill",
		id: "triageBackToListBtn",
		onClick: () => window.closeTriageDeckMode?.()
	}, "☰ 列表模式")), /* @__PURE__ */ k("div", {
		class: "dsh-triage-stack",
		id: "triageCardStack"
	}, /* @__PURE__ */ k("div", {
		class: "dsh-triage-back-card layer-deep",
		id: "triageLayerDeep"
	}, /* @__PURE__ */ k("div", { class: "dsh-triage-back-inner" })), /* @__PURE__ */ k("div", {
		class: "dsh-triage-back-card layer-left",
		id: "triageLayerLeft"
	}, /* @__PURE__ */ k("div", { class: "dsh-triage-back-inner" })), /* @__PURE__ */ k("div", {
		class: "dsh-triage-back-card layer-right",
		id: "triageLayerRight"
	}, /* @__PURE__ */ k("div", {
		class: "dsh-triage-back-inner",
		id: "triageLayerRightInner"
	})), /* @__PURE__ */ k("div", {
		class: "dsh-triage-fg-card",
		id: "triageFgCard"
	})), /* @__PURE__ */ k("div", {
		class: "dsh-triage-modal",
		id: "triageDetailModal",
		onClick: (e) => {
			if (e.target === e.currentTarget) window.closeTriageDetailModal?.();
		}
	}, /* @__PURE__ */ k("div", {
		class: "dsh-triage-modal-sheet",
		id: "triageDetailModalContent"
	}, /* @__PURE__ */ k("div", {
		class: "dsh-triage-modal-hdr",
		id: "triageModalHeader"
	}, /* @__PURE__ */ k("div", {
		class: "dsh-triage-sheet-grabber",
		"aria-hidden": "true"
	}), /* @__PURE__ */ k("div", { class: "dsh-triage-modal-hdr-row" }, /* @__PURE__ */ k("strong", {
		id: "triageModalTitle",
		style: "font-size:15px;color:#0f172a;"
	}, "详情"), /* @__PURE__ */ k("div", { class: "dsh-triage-modal-actions" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "dsh-triage-open-chat",
		id: "triageModalExpandBtn",
		onClick: () => window.toggleTriageModalExpand?.()
	}, "⤢ 全屏"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "dsh-triage-open-chat",
		id: "triageModalCloseBtn",
		onClick: () => window.closeTriageDetailModal?.()
	}, "收起 ✕")))), /* @__PURE__ */ k("div", {
		class: "dsh-triage-modal-body",
		id: "triageModalScrollBody"
	}))));
}
// hub/web/src/components/ChatStage.tsx
function ChatStage() {
	return /* @__PURE__ */ k("section", {
		class: "chat-fullscreen chat-stage",
		id: "chatFullscreen"
	}, /* @__PURE__ */ k("div", { class: "chat-navbar" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "back-btn",
		onClick: () => window.closeMobileChat?.()
	}, "‹ 返回"), /* @__PURE__ */ k("div", { class: "chat-nav-center" }, /* @__PURE__ */ k("div", {
		class: "chat-nav-title",
		id: "chatTitle"
	}, "选择一个会话"), /* @__PURE__ */ k("div", {
		class: "chat-nav-sub",
		id: "chatSub"
	}, "点击左侧任意对话开始遥控")), /* @__PURE__ */ k("div", { class: "chat-nav-actions" }, /* @__PURE__ */ k("div", { class: "desktop-stage-tabs" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "stage-seg-btn active",
		id: "stageBtnChat",
		onClick: () => window.switchDesktopStage?.("chat")
	}, "💬 对话流"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "stage-seg-btn",
		id: "stageBtnCode",
		onClick: () => window.switchDesktopStage?.("code")
	}, "📂 项目代码")), /* @__PURE__ */ k("button", {
		type: "button",
		class: "icon-pill-btn mobile-only-file-btn",
		onClick: () => window.openInChatFileDrawer?.()
	}, "📂 文件速览"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "icon-pill-btn",
		onClick: () => window.openCurrentSessionActions?.()
	}, "⋯"))), /* @__PURE__ */ k("div", {
		class: "chat-switch-alert",
		id: "chatSwitchAlert",
		style: "display:none;"
	}), /* @__PURE__ */ k("div", {
		class: "chat-messages",
		id: "chatMessages"
	}, /* @__PURE__ */ k("div", { style: "margin:auto;text-align:center;color:#94a3b8;font-size:14px;" }, "👈 点击任意会话查看详细对话与思考过程")), /* @__PURE__ */ k("div", {
		class: "main-viewport file-preview-pane",
		id: "desktopStageCodePane",
		style: "display:none;background:var(--surface);"
	}), /* @__PURE__ */ k("div", {
		class: "running-control-bar",
		id: "runningControlBar"
	}, /* @__PURE__ */ k("span", null, "🟢 AI 正在电脑上执行任务..."), /* @__PURE__ */ k("button", {
		type: "button",
		class: "stop-task-btn",
		onClick: () => window.stopActiveSession?.()
	}, "⏹ 立即停止")), /* @__PURE__ */ k("div", {
		class: "composer-attachments-strip",
		id: "composerAttachmentsStrip",
		style: "display:none;"
	}), /* @__PURE__ */ k("div", {
		class: "chat-composer",
		id: "chatComposerBar"
	}, /* @__PURE__ */ k("input", {
		type: "file",
		id: "chatImageInput",
		accept: "image/*",
		multiple: true,
		style: "display:none;",
		onChange: (e) => window.onChatImageSelected?.(e, "chat")
	}), /* @__PURE__ */ k("div", {
		class: "composer-unified-card",
		id: "composerUnifiedCard"
	}, /* @__PURE__ */ k("div", {
		class: "voice-hint-bar",
		id: "chatVoiceHintBar",
		style: "display:none;",
		onClick: () => window.hideVoiceHintBar?.("globalPromptInput")
	}), /* @__PURE__ */ k("textarea", {
		class: "chat-input",
		id: "globalPromptInput",
		rows: 1,
		placeholder: "发指令继续对话...",
		autocorrect: "on",
		autocapitalize: "sentences",
		spellcheck: true,
		onInput: (e) => {
			if (!window.isVoiceRecording?.() && !e?.isComposing) window.hideVoiceHintBar?.("globalPromptInput");
			window.onComposerInput?.(e);
		},
		onKeyDown: (e) => window.onComposerKeydown?.(e),
		onPaste: (e) => window.onComposerPaste?.(e, "chat")
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "wechat-hold-talk-btn",
		id: "wechatHoldTalkBtn",
		onContextMenu: (e) => e.preventDefault(),
		onTouchStart: (e) => {
			window.__dshLastHoldTouchAt = Date.now();
			e.preventDefault();
			e.stopPropagation();
			const t = e.touches?.[0];
			window.startHoldVoice?.(t ? t.clientX : 0, t ? t.clientY : 0);
		},
		onMouseDown: (e) => {
			if (e.button !== 0) return;
			if (Date.now() - (window.__dshLastHoldTouchAt || 0) < 800) return;
			e.preventDefault();
			e.stopPropagation();
			window.startHoldVoice?.(e.clientX, e.clientY);
		}
	}, /* @__PURE__ */ k("span", { id: "wechatHoldTalkLabel" }, "🎙️ 按住 说话")), /* @__PURE__ */ k("div", { class: "composer-toolbar-row" }, /* @__PURE__ */ k("div", { class: "composer-tools-left" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "voice-btn composer-mini-btn mode-toggle-btn",
		id: "chatVoiceBtn",
		title: "切换为微信式按住说话",
		"aria-label": "切换为微信式按住说话",
		onMouseDown: (e) => {
			e.preventDefault();
		},
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.toggleWechatVoiceMode?.();
		}
	}, "🎙️ 语音"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "voice-btn composer-mini-btn image-upload-btn",
		id: "chatImageBtn",
		title: "从手机相册上传截图或照片",
		"aria-label": "上传截图或照片",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.triggerImagePicker?.("chat");
		}
	}, "🖼️"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "composer-model-pill",
		id: "chatModelBtn",
		title: "切换当前对话使用的 AI 模型",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.openModelPickerSheet?.("chat");
		}
	}, /* @__PURE__ */ k("span", { id: "chatModelBtnLabel" }, "🤖 默认模型"), /* @__PURE__ */ k("span", { style: "opacity:0.65;font-size:10px;margin-left:2px;" }, "▾"))), /* @__PURE__ */ k("button", {
		type: "button",
		class: "send-btn composer-send-btn",
		id: "chatSendBtn",
		onMouseDown: (e) => {
			e.preventDefault();
		},
		onClick: () => window.sendPromptToActiveSession?.()
	}, "发送")))), /* @__PURE__ */ k("div", {
		class: "wechat-voice-overlay zone-send",
		id: "wechatVoiceOverlay",
		style: "display:none;",
		"aria-live": "polite"
	}, /* @__PURE__ */ k("div", { class: "wechat-voice-bubble-wrap" }, /* @__PURE__ */ k("div", {
		class: "wechat-voice-bubble",
		id: "wechatVoiceBubble"
	}, /* @__PURE__ */ k("div", {
		class: "wechat-voice-transcript is-placeholder",
		id: "wechatOverlayTranscript"
	}, "正在听你说话…"), /* @__PURE__ */ k("div", {
		class: "wechat-voice-wave",
		"aria-hidden": "true"
	}, /* @__PURE__ */ k("span", null), /* @__PURE__ */ k("span", null), /* @__PURE__ */ k("span", null), /* @__PURE__ */ k("span", null), /* @__PURE__ */ k("span", null))), /* @__PURE__ */ k("div", { class: "wechat-voice-bubble-tail" })), /* @__PURE__ */ k("div", { class: "wechat-voice-actions" }, /* @__PURE__ */ k("div", {
		class: "wechat-voice-action-item cancel-zone",
		id: "wechatZoneCancel"
	}, /* @__PURE__ */ k("div", { class: "wechat-voice-action-circle" }, "✕"), /* @__PURE__ */ k("span", { class: "wechat-voice-action-tip" }, "左滑取消")), /* @__PURE__ */ k("div", {
		class: "wechat-voice-action-item edit-zone",
		id: "wechatZoneEdit"
	}, /* @__PURE__ */ k("div", { class: "wechat-voice-action-circle" }, "文"), /* @__PURE__ */ k("span", { class: "wechat-voice-action-tip" }, "右滑改字"))), /* @__PURE__ */ k("div", { class: "wechat-voice-bottom-dock" }, /* @__PURE__ */ k("div", {
		class: "wechat-voice-status-text",
		id: "wechatOverlayStatus"
	}, "松开 立即发送"), /* @__PURE__ */ k("div", { class: "wechat-voice-bottom-arc" }, "🎙️"))));
}
// hub/web/src/components/Sheets.tsx
function Sheets() {
	const closeIfBackdrop = (sheetId) => (e) => {
		if (e.target === e.currentTarget) window.closeSheet?.(sheetId);
	};
	return /* @__PURE__ */ k(M, null, /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "hostSheet",
		onClick: closeIfBackdrop("hostSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", null, "切换遥控的电脑"), /* @__PURE__ */ k("span", {
		style: "font-size:12px;color:var(--muted);font-weight:500;",
		id: "hostSheetCountLabel"
	})), /* @__PURE__ */ k("div", { id: "hostOptionList" }))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "newTaskSheet",
		onClick: closeIfBackdrop("newTaskSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel new-task-sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", {
		class: "sheet-title",
		style: "margin-bottom:12px;"
	}, /* @__PURE__ */ k("span", null, "✨ 新建远程对话任务"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 8px;",
		onClick: () => window.closeSheet?.("newTaskSheet")
	}, "✕")), /* @__PURE__ */ k("div", { class: "new-task-context-card" }, /* @__PURE__ */ k("div", { class: "new-task-context-row" }, /* @__PURE__ */ k("span", { class: "context-row-label" }, "💻 执行电脑"), /* @__PURE__ */ k("div", {
		class: "context-row-chips",
		id: "newTaskHostChips"
	})), /* @__PURE__ */ k("div", { class: "new-task-context-row" }, /* @__PURE__ */ k("span", { class: "context-row-label" }, "⚡ 执行引擎"), /* @__PURE__ */ k("div", {
		class: "context-row-chips",
		id: "newTaskHarnessChips"
	}))), /* @__PURE__ */ k("div", { class: "new-task-proj-section" }, /* @__PURE__ */ k("div", { class: "new-task-proj-header" }, /* @__PURE__ */ k("span", { class: "proj-header-title" }, "📁 项目工作区"), /* @__PURE__ */ k("div", { style: "display:flex;align-items:center;gap:6px;flex-wrap:nowrap;" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "proj-header-more-btn",
		id: "newTaskBrowseDirBtn",
		onClick: () => window.openNewTaskProjectPickerSheet?.("browse")
	}, "📂 选择目录"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "proj-header-more-btn",
		id: "newTaskCreateWsBtn",
		onClick: () => window.openNewTaskProjectPickerSheet?.("create")
	}, "＋ 新工作区"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "proj-header-more-btn",
		id: "newTaskProjMoreBtn",
		onClick: () => window.openNewTaskProjectPickerSheet?.("recent")
	}, "全部 ▾"))), /* @__PURE__ */ k("div", {
		class: "new-task-proj-scroll",
		id: "newTaskProjectChips"
	}), /* @__PURE__ */ k("div", {
		id: "newTaskSelectedPathBar",
		style: "margin-top:5px;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
	})), /* @__PURE__ */ k("div", { class: "new-task-card-wrap" }, /* @__PURE__ */ k("div", {
		class: "composer-attachments-strip",
		id: "newTaskAttachmentsStrip",
		style: "display:none;margin-bottom:8px;border:1px solid var(--border);border-radius:12px;"
	}), /* @__PURE__ */ k("div", {
		class: "voice-hint-bar",
		id: "newTaskVoiceHintBar",
		style: "display:none;margin-bottom:8px;",
		onClick: () => window.hideVoiceHintBar?.("newTaskInput")
	}), /* @__PURE__ */ k("textarea", {
		class: "new-task-textarea",
		id: "newTaskInput",
		placeholder: "输入你想让电脑执行的任务，或点击下方传截图/语音输入...",
		autocorrect: "on",
		autocapitalize: "sentences",
		spellcheck: true,
		onInput: (e) => {
			if (!window.isVoiceRecording?.() && !e?.isComposing) window.hideVoiceHintBar?.("newTaskInput");
		},
		onPaste: (e) => window.onComposerPaste?.(e, "newTask")
	}), /* @__PURE__ */ k("div", { class: "new-task-toolbar" }, /* @__PURE__ */ k("input", {
		type: "file",
		id: "newTaskImageInput",
		accept: "image/*",
		multiple: true,
		style: "display:none;",
		onChange: (e) => window.onChatImageSelected?.(e, "newTask")
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "new-task-tool-btn model-btn",
		id: "newTaskModelBtn",
		title: "选择模型",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.openModelPickerSheet?.("newTask");
		}
	}, /* @__PURE__ */ k("span", { id: "newTaskModelBtnLabel" }, "🤖 默认模型"), /* @__PURE__ */ k("span", {
		class: "model-arrow",
		style: "opacity:0.7;font-size:10px;margin-left:3px;"
	}, "▾")), /* @__PURE__ */ k("div", { class: "new-task-toolbar-actions" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "new-task-tool-btn",
		id: "newTaskImageBtn",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.triggerImagePicker?.("newTask");
		}
	}, "🖼️ 截图"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "new-task-tool-btn",
		id: "newTaskVoiceBtn",
		onMouseDown: (e) => {
			e.preventDefault();
		},
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.toggleVoiceInput?.("newTaskInput", "newTaskVoiceBtn");
		}
	}, "🎤 语音")))), /* @__PURE__ */ k("div", { class: "new-task-quick-strip" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "quick-prompt-pill",
		onClick: () => window.fillQuickPrompt?.("帮我检查当前项目的定时任务和运行日志是否正常")
	}, "🔍 检查运行状态"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "quick-prompt-pill",
		onClick: () => window.fillQuickPrompt?.("运行单元测试并修复所有报错")
	}, "🧪 跑测试修 Bug"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "quick-prompt-pill",
		onClick: () => window.fillQuickPrompt?.("查看 git status 并总结最近的代码改动")
	}, "📦 总结代码改动")), /* @__PURE__ */ k("button", {
		type: "button",
		class: "primary-block-btn new-task-submit-btn",
		onClick: () => window.submitNewTask?.()
	}, "🚀 立即在电脑上启动任务"))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "newTaskProjectPickerSheet",
		onClick: closeIfBackdrop("newTaskProjectPickerSheet")
	}, /* @__PURE__ */ k("div", {
		class: "sheet-panel",
		style: "max-height:82dvh;display:flex;flex-direction:column;"
	}, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", {
		class: "sheet-title",
		style: "margin-bottom:10px;"
	}, /* @__PURE__ */ k("span", { id: "newTaskPickerSheetTitle" }, "📁 选择目录或新建工作区"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 8px;",
		onClick: () => window.closeSheet?.("newTaskProjectPickerSheet")
	}, "✕")), /* @__PURE__ */ k("div", {
		id: "newTaskPickerModeTabs",
		style: "display:flex;gap:6px;padding:3px;background:var(--subtle);border-radius:10px;margin-bottom:10px;"
	}, /* @__PURE__ */ k("button", {
		type: "button",
		class: "theme-seg-btn",
		id: "newTaskTabRecent",
		style: "flex:1;padding:6px 8px;font-size:12.5px;",
		onClick: () => window.switchNewTaskPickerMode?.("recent")
	}, "🕒 已有工作区"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "theme-seg-btn",
		id: "newTaskTabBrowse",
		style: "flex:1;padding:6px 8px;font-size:12.5px;",
		onClick: () => window.switchNewTaskPickerMode?.("browse")
	}, "📂 选择目录"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "theme-seg-btn",
		id: "newTaskTabCreate",
		style: "flex:1;padding:6px 8px;font-size:12.5px;",
		onClick: () => window.switchNewTaskPickerMode?.("create")
	}, "✨ 新工作区")), /* @__PURE__ */ k("div", {
		id: "newTaskPickerSearchWrap",
		style: "padding:0 2px 8px;"
	}, /* @__PURE__ */ k("input", {
		type: "text",
		class: "auth-input",
		id: "newTaskProjectSearchInput",
		placeholder: "搜索项目名称或路径...",
		style: "margin:0;",
		onInput: (e) => window.filterNewTaskProjects?.(e.target.value)
	})), /* @__PURE__ */ k("div", {
		class: "host-options-list",
		id: "newTaskProjectPickerBody",
		style: "flex:1;max-height:56vh;overflow-y:auto;"
	}))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "taskActionSheet",
		onClick: closeIfBackdrop("taskActionSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", {
		class: "sheet-title",
		id: "actionSheetTitle"
	}, "会话操作"), /* @__PURE__ */ k("div", { id: "actionSheetBody" }))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "inChatFileSheet",
		onClick: closeIfBackdrop("inChatFileSheet")
	}, /* @__PURE__ */ k("div", {
		class: "sheet-panel",
		"data-expandable": "1"
	}, /* @__PURE__ */ k("div", {
		class: "sheet-drag-zone",
		title: "上拉或点击展开更多",
		onClick: () => window.toggleFileSheetExpanded?.()
	}, /* @__PURE__ */ k("div", { class: "sheet-handle" })), /* @__PURE__ */ k("div", {
		class: "sheet-title",
		style: "padding:0 14px 9px;margin:0;border-bottom:1px solid var(--border);gap:8px;"
	}, /* @__PURE__ */ k("span", {
		id: "inChatFileTitle",
		style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"
	}, "📂 当前项目文件速览"), /* @__PURE__ */ k("div", { class: "sheet-title-actions" }, /* @__PURE__ */ k("button", {
		type: "button",
		id: "inChatFileExpandBtn",
		class: "sheet-icon-btn",
		title: "展开显示更多",
		"aria-label": "展开显示更多",
		onClick: () => window.toggleFileSheetExpanded?.()
	}, "⤢"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "sheet-icon-btn",
		title: "关闭",
		"aria-label": "关闭",
		onClick: () => window.closeMobileFile?.()
	}, "✕"))), /* @__PURE__ */ k("div", {
		id: "inChatFileBody",
		style: "flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;"
	}))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "mobileSettingsSheet",
		onClick: closeIfBackdrop("mobileSettingsSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", null, "📦 跨电脑一键迁移向导"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeSheet?.("mobileSettingsSheet")
	}, "✕")), /* @__PURE__ */ k("div", { id: "migrateWizardBody" }))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "turboGuideSheet",
		onClick: closeIfBackdrop("turboGuideSheet")
	}, /* @__PURE__ */ k("div", {
		class: "sheet-panel",
		style: "max-height:86dvh;overflow-y:auto;"
	}, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", null, "⚡ 极速实时同步 (Rust + SSE) 指南"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeSheet?.("turboGuideSheet")
	}, "✕")), /* @__PURE__ */ k("div", { id: "turboGuideBody" }))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "shareResultSheet",
		onClick: closeIfBackdrop("shareResultSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", null, "🔗 端到端加密分享已生成"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeSheet?.("shareResultSheet")
	}, "✕")), /* @__PURE__ */ k("div", { id: "shareResultBody" }))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "pairingCodeSheet",
		onClick: closeIfBackdrop("pairingCodeSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", null, "📱 添加新手机（6 位配对码）"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closePairingCodeSheet?.()
	}, "✕")), /* @__PURE__ */ k("div", { id: "pairingCodeBody" }))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "copyFallbackSheet",
		onClick: closeIfBackdrop("copyFallbackSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", { id: "copyFallbackTitle" }, "📋 复制内容"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeSheet?.("copyFallbackSheet")
	}, "✕")), /* @__PURE__ */ k("div", { style: "font-size:12px;color:var(--muted);margin-bottom:8px;" }, "当前浏览器限制自动写入剪贴板，请点下方按钮或长按文本框全选复制："), /* @__PURE__ */ k("textarea", {
		id: "copyFallbackTextarea",
		readonly: true,
		class: "new-task-textarea",
		style: "min-height:92px;font-family:var(--mono);font-size:12px;margin-bottom:10px;",
		onClick: (e) => e.currentTarget.select()
	}), /* @__PURE__ */ k("div", { style: "display:flex;gap:8px;" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "primary-block-btn",
		style: "margin-top:0;flex:1;",
		onClick: () => window.retryCopyFromFallbackSheet?.()
	}, "📋 点击复制"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "choice-chip",
		style: "padding:0 16px;",
		onClick: () => window.closeSheet?.("copyFallbackSheet")
	}, "关闭")))), /* @__PURE__ */ k("div", {
		class: "sheet-backdrop",
		id: "modelPickerSheet",
		onClick: closeIfBackdrop("modelPickerSheet")
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", { id: "modelPickerTitle" }, "🤖 选择 AI 模型"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeSheet?.("modelPickerSheet")
	}, "✕")), /* @__PURE__ */ k("div", { id: "modelPickerBody" }))), /* @__PURE__ */ k("div", {
		id: "htmlPreviewOverlay",
		style: "display:none;position:fixed;inset:0;z-index:9999;background:#0f172a;flex-direction:column;"
	}, /* @__PURE__ */ k("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px;padding:max(10px, env(safe-area-inset-top)) 12px 10px;background:#0f172a;border-bottom:1px solid rgba(148,163,184,0.22);color:#f8fafc;flex-shrink:0;" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "icon-pill-btn",
		style: "background:rgba(255,255,255,0.12);color:#ffffff;border-color:rgba(255,255,255,0.22);font-weight:700;padding:6px 12px;",
		onClick: () => window.closeFullscreenHtmlPreview?.()
	}, "‹ 返回对话"), /* @__PURE__ */ k("span", {
		id: "htmlPreviewOverlayTitle",
		style: "font-size:13.5px;font-weight:700;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:center;"
	}, "🌐 HTML 交互预览"), /* @__PURE__ */ k("div", { style: "display:flex;align-items:center;gap:6px;flex-shrink:0;" }, /* @__PURE__ */ k("button", {
		type: "button",
		class: "icon-pill-btn",
		id: "htmlPreviewModeBtn",
		style: "background:rgba(255,255,255,0.1);color:#e2e8f0;border-color:rgba(255,255,255,0.18);",
		onClick: () => window.toggleFullscreenHtmlSource?.()
	}, "</> 源码"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "icon-pill-btn",
		title: "重新加载网页",
		style: "background:rgba(255,255,255,0.1);color:#e2e8f0;border-color:rgba(255,255,255,0.18);",
		onClick: () => window.reloadFullscreenHtmlPreview?.()
	}, "🔄"))), /* @__PURE__ */ k("div", {
		id: "htmlPreviewOverlayBody",
		style: "flex:1;position:relative;background:#ffffff;overflow:auto;"
	})));
}
// hub/web/src/App.tsx
var HARNESS_SVG_SPRITE = `<svg id="dshHarnessSvgDefs" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dsh-grad-ocean" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="dsh-grad-codex" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8A9CFF"/>
      <stop offset="50%" stop-color="#5562FF"/>
      <stop offset="100%" stop-color="#3941FF"/>
    </linearGradient>

    <mask id="dsh-agy-mask" maskUnits="userSpaceOnUse" x="0" y="1" width="24" height="23">
      <path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1 5.17 1 6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714 4.857 0 4.522 6.197 9.714 9.715z" fill="#fff"/>
    </mask>
    <filter id="dsh-agy-blur-sm" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
    <filter id="dsh-agy-blur-md" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="3.8"/>
    </filter>

    <mask id="dsh-wb-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24" style="mask-type:luminance">
      <path d="M18.821 0H5.179A5.18 5.18 0 0 0 0 5.179v13.642A5.18 5.18 0 0 0 5.179 24h13.642A5.18 5.18 0 0 0 24 18.821V5.179A5.18 5.18 0 0 0 18.821 0" fill="#fff"/>
    </mask>
    <linearGradient id="dsh-wb-bg" gradientUnits="userSpaceOnUse" x1="12" y1="0" x2="12" y2="24">
      <stop stop-color="#0ec8a9"/>
      <stop offset="1" stop-color="#01c886"/>
    </linearGradient>
    <linearGradient id="dsh-wb-body" gradientUnits="userSpaceOnUse" x1="10.098" y1="6.802" x2="21.325" y2="26.248">
      <stop stop-color="#fff" stop-opacity=".85"/>
      <stop offset=".438" stop-color="#fff"/>
    </linearGradient>
    <filter id="dsh-wb-glow" x="-50%" y="-50%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="4.5"/>
    </filter>

    <!-- 1. Antigravity IDE -->
    <symbol id="dsh-icon-ide" viewBox="0 0 24 24">
      <rect x="0.4" y="0.4" width="23.2" height="23.2" rx="5.2" fill="#14161B" stroke="#334155" stroke-width="0.8"/>
      <g stroke="#ffffff" stroke-opacity="0.07" stroke-width="0.6">
        <line x1="6" y1="0" x2="6" y2="24"/><line x1="12" y1="0" x2="12" y2="24"/><line x1="18" y1="0" x2="18" y2="24"/>
        <line x1="0" y1="6" x2="24" y2="6"/><line x1="0" y1="12" x2="24" y2="12"/><line x1="0" y1="18" x2="24" y2="18"/>
      </g>
      <g transform="translate(2.9, 2.7) scale(0.76)">
        <g mask="url(#dsh-agy-mask)">
          <rect x="-4" y="-4" width="32" height="32" fill="#3186FF"/>
          <g filter="url(#dsh-agy-blur-md)">
            <circle cx="3" cy="6" r="9" fill="#00B95C"/>
            <circle cx="21" cy="5" r="9" fill="#FC413D"/>
            <circle cx="11" cy="0" r="8" fill="#FBBC04"/>
            <ellipse cx="12" cy="21" rx="13" ry="9" fill="#3186FF"/>
          </g>
          <g filter="url(#dsh-agy-blur-sm)">
            <circle cx="4" cy="2" r="5" fill="#FFE432"/>
            <circle cx="21" cy="4" r="6" fill="#FC413D"/>
          </g>
        </g>
      </g>
    </symbol>

    <!-- 2. WorkBuddy -->
    <symbol id="dsh-icon-workbuddy" viewBox="0 0 24 24">
      <g mask="url(#dsh-wb-mask)">
        <path d="M18.821 0H5.179A5.18 5.18 0 0 0 0 5.179v13.642A5.18 5.18 0 0 0 5.179 24h13.642A5.18 5.18 0 0 0 24 18.821V5.179A5.18 5.18 0 0 0 18.821 0" fill="url(#dsh-wb-bg)"/>
        <circle cx="18.8" cy="25" r="7.7" fill="#ffe355" fill-opacity=".55" filter="url(#dsh-wb-glow)"/>
        <path d="M18.456 2.031c.235-.21.25-.219.422-.23.28-.02.535.115.971.512 1.019.925 2.437 2.827 3.318 4.452l.34.63.482.24c.464.235 1.226.715 1.544.973.144.12.165.122.315.064.675-.263 1.642.086 2.495.904.768.736 1.504 1.994 1.786 3.044.041.17.096.533.116.803.064.95-.24 1.708-.827 2.052-.12.069-.128.088-.125.386.027 1.423-.356 2.842-1.126 4.227-.87 1.555-2.418 3.163-4.513 4.679-1.126.819-3.788 2.37-4.991 2.915-2.884 1.298-5.196 1.795-7.204 1.55-1.197-.146-2.553-.613-3.355-1.156-.211-.146-.245-.155-.406-.109-.859.247-1.983-.26-2.938-1.32-.381-.424-.996-1.465-1.196-2.022-.461-1.303-.37-2.48.245-3.182.159-.181.164-.189.129-.493a12 12 0 0 1-.057-1.71l.02-.445-.666-1.18c-1.033-1.838-1.69-3.381-1.943-4.56-.133-.647-.125-.934.039-1.146.1-.128.428-.261.823-.335.994-.174 3.162-.016 5.575.41l.25.044.551-.488c.914-.81 1.522-1.263 2.642-1.962 1.166-.73 2.483-1.33 3.967-1.806l.475-.152.262-.687c.937-2.473 1.896-4.295 2.58-4.902m-7.845 12.67c-1.059.61-1.588.916-1.977 1.259a5.21 5.21 0 0 0-1.494 5.57c.165.491.47 1.02 1.082 2.08.61 1.058.917 1.587 1.26 1.976a5.21 5.21 0 0 0 5.571 1.493c.491-.165 1.02-.471 2.079-1.082l6.09-3.516c1.058-.611 1.587-.916 1.976-1.259a5.21 5.21 0 0 0 1.492-5.572c-.165-.491-.47-1.02-1.082-2.079-.611-1.058-.916-1.588-1.259-1.976a5.21 5.21 0 0 0-5.571-1.493c-.491.165-1.02.47-2.08 1.082z" fill="url(#dsh-wb-body)"/>
        <path d="M13.882 18.795a1.203 1.203 0 0 0-2.083 1.203l1.295 2.243a1.203 1.203 0 1 0 2.083-1.203zm6.49-3.747a1.203 1.203 0 1 0-2.083 1.203l1.295 2.243a1.203 1.203 0 0 0 2.083-1.203z" fill="#fff"/>
      </g>
    </symbol>

    <!-- 3. OpenAI Codex: 官方蓝紫圆角底座 + 官方六瓣花云与 >_ 终端镂空标志 -->
    <symbol id="dsh-icon-codex" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="url(#dsh-grad-codex)"/>
      <g transform="translate(2.7, 2.7) scale(0.775)">
        <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"/>
      </g>
    </symbol>

    <!-- 4. Claude Code -->
    <symbol id="dsh-icon-claude" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="#D97757"/>
      <g stroke="#FFF7ED" stroke-width="2.0" stroke-linecap="round">
        <line x1="12" y1="4.5" x2="12" y2="19.5"/>
        <line x1="4.5" y1="12" x2="19.5" y2="12"/>
        <line x1="6.7" y1="6.7" x2="17.3" y2="17.3"/>
        <line x1="17.3" y1="6.7" x2="6.7" y2="17.3"/>
        <line x1="9.1" y1="5.1" x2="14.9" y2="18.9" stroke-width="1.4"/>
        <line x1="5.1" y1="14.9" x2="18.9" y2="9.1" stroke-width="1.4"/>
      </g>
      <circle cx="12" cy="12" r="2.2" fill="#FFF7ED"/>
    </symbol>

    <!-- 5. DeepSeek Harness -->
    <symbol id="dsh-icon-dsh" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="url(#dsh-grad-ocean)"/>
      <path d="M5.2 13.6c0-3.5 3.1-6 7.1-6 3.2 0 5.3 1.8 6.1 3.9.5-1.1 1.6-2 3-2.1-.3 1.8-1.3 3.1-2.7 3.6.2 2.9-2.5 5.2-6.6 5.2-4.1 0-6.9-1.9-6.9-4.6z" fill="#FFFFFF"/>
      <circle cx="9.2" cy="12.2" r="1.0" fill="#1D4ED8"/>
      <path d="M10.5 5.2c.4-.9 1.3-1.4 2.1-1.2M8.8 5.8c-.3-.8-.9-1.2-1.7-1.1" stroke="#93C5FD" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    </symbol>

    <!-- 6. Doubao Desktop -->
    <symbol id="dsh-icon-doubao" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="#1E6FFF"/>
      <circle cx="12" cy="12.2" r="6.8" fill="#FFFFFF"/>
      <circle cx="9.6" cy="11.2" r="1.15" fill="#1E6FFF"/>
      <circle cx="14.4" cy="11.2" r="1.15" fill="#1E6FFF"/>
      <path d="M9.4 14.3c.7.9 1.6 1.3 2.6 1.3s1.9-.4 2.6-1.3" stroke="#1E6FFF" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    </symbol>
  </defs>
</svg>`;
function App() {
	return /* @__PURE__ */ k(M, null, /* @__PURE__ */ k("div", {
		style: "position:fixed;left:-9999px;top:-9999px;width:24px;height:24px;overflow:hidden;opacity:0;pointer-events:none;",
		"aria-hidden": "true",
		dangerouslySetInnerHTML: { __html: HARNESS_SVG_SPRITE }
	}), /* @__PURE__ */ k("div", {
		class: "install-hint",
		id: "installHint"
	}, /* @__PURE__ */ k("div", { class: "install-hint-text" }, "📲 想收锁屏通知？点底部分享 ", /* @__PURE__ */ k("strong", null, "→ 添加到主屏幕"), "，再从桌面图标打开"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "install-hint-close",
		onClick: () => window.dismissInstallHint?.()
	}, "知道了")), /* @__PURE__ */ k("div", {
		class: "toast-pill",
		id: "toastPill"
	}, "操作成功"), /* @__PURE__ */ k("div", { class: "preview-toolbar" }, /* @__PURE__ */ k("span", null, "视图体验："), /* @__PURE__ */ k("button", {
		type: "button",
		id: "btnPhoneMode",
		class: "active",
		onClick: () => window.setPreviewMode?.("phone")
	}, "📱 iPhone 手机视图"), /* @__PURE__ */ k("button", {
		type: "button",
		id: "btnDesktopMode",
		onClick: () => window.setPreviewMode?.("desktop")
	}, "🖥️ 电脑双栏同屏视图"), /* @__PURE__ */ k("button", {
		type: "button",
		"data-lang-toggle": "1",
		onClick: () => window.toggleLangPreference?.()
	}, "🌐 EN")), /* @__PURE__ */ k("div", {
		class: "auth-overlay",
		id: "authOverlay"
	}, /* @__PURE__ */ k("div", {
		class: "auth-card",
		style: "position:relative;"
	}, /* @__PURE__ */ k("button", {
		type: "button",
		"data-lang-toggle": "1",
		onClick: () => window.toggleLangPreference?.(),
		style: "position:absolute;top:14px;right:14px;border:1px solid var(--border);background:var(--subtle);color:var(--text-secondary);border-radius:999px;padding:4px 10px;font-size:11.5px;font-weight:700;cursor:pointer;"
	}, "🌐 EN"), /* @__PURE__ */ k("div", { style: "font-size:38px;margin-bottom:8px;" }, "🔒"), /* @__PURE__ */ k("div", { style: "font-size:18px;font-weight:800;color:var(--text);" }, "DSH 远控控制台登录"), /* @__PURE__ */ k("div", { style: "font-size:12.5px;color:var(--text-secondary);margin-top:8px;line-height:1.6;text-align:left;background:var(--subtle);padding:10px 12px;border-radius:10px;border:1px solid var(--border);" }, /* @__PURE__ */ k("div", null, "💻 ", /* @__PURE__ */ k("strong", null, "电脑首次接入"), "：输入部署时设置的管理密码 (", /* @__PURE__ */ k("code", null, "HUB_TOKEN"), ")"), /* @__PURE__ */ k("div", { style: "margin-top:4px;" }, "📱 ", /* @__PURE__ */ k("strong", null, "手机免密登录"), "：直接扫电脑网页上的二维码，或输入 6 位配对码")), /* @__PURE__ */ k("input", {
		type: "password",
		class: "auth-input",
		id: "authTokenInput",
		placeholder: "输入管理密码 (HUB_TOKEN) 或 6 位配对码...",
		onKeyDown: (e) => {
			if (e.key === "Enter") window.submitAuthLogin?.();
		}
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "primary-block-btn",
		onClick: () => window.submitAuthLogin?.()
	}, "🔓 解锁进入总控台"))), /* @__PURE__ */ k("div", { class: "app-shell" }, /* @__PURE__ */ k("div", { class: "primary-pane" }, /* @__PURE__ */ k(TopBar, null), /* @__PURE__ */ k("div", {
		class: "pull-refresh-slot",
		id: "pullRefreshSlot",
		"aria-hidden": "true"
	}, /* @__PURE__ */ k("div", {
		class: "pull-refresh-pill",
		id: "pullRefreshPill"
	}, /* @__PURE__ */ k("span", { id: "pullRefreshLabel" }, "↓ 下拉刷新状态"))), /* @__PURE__ */ k("main", {
		class: "main-viewport",
		id: "mainViewport"
	}), /* @__PURE__ */ k(BottomTabs, null), /* @__PURE__ */ k(TriageDeck, null)), /* @__PURE__ */ k(ChatStage, null), /* @__PURE__ */ k(Sheets, null), /* @__PURE__ */ k("button", {
		type: "button",
		id: "scrollBottomBtn",
		style: "display:none;",
		onClick: () => window.scrollToChatBottom?.()
	}, "⬇️ 最新消息")));
}
// hub/web/src/utils/format.ts
function esc$1(str) {
	return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function cleanPreviewText(raw) {
	return String(raw || "").replace(/```[\s\S]*?```/g, "[代码片段] ").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/#{1,6}\s+/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
}
function formatTime(ts) {
	if (!ts) return "";
	const num = typeof ts === "number" ? ts : Date.parse(String(ts));
	if (!Number.isFinite(num) || num <= 0) return "";
	const diffSec = Math.max(0, Math.floor((Date.now() - num) / 1e3));
	if (diffSec < 60) return "刚刚";
	if (diffSec < 3600) return Math.floor(diffSec / 60) + " 分钟前";
	if (diffSec < 86400) return Math.floor(diffSec / 3600) + " 小时前";
	if (diffSec < 2592e3) return Math.floor(diffSec / 86400) + " 天前";
	const d = new Date(num);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatBytes(bytes) {
	const b = Number(bytes) || 0;
	if (b < 1024) return b + " B";
	if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
	return (b / 1048576).toFixed(1) + " MB";
}
function urlBase64ToUint8Array(base64String) {
	const base64 = (base64String + "=".repeat((4 - base64String.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
function isIosDevice() {
	const ua = navigator.userAgent || "";
	if (/iPad|iPhone|iPod/.test(ua)) return true;
	return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
}
function isStandaloneApp() {
	if (navigator.standalone === true) return true;
	try {
		return window.matchMedia("(display-mode: standalone)").matches;
	} catch {
		return false;
	}
}
function isIosDeviceForHint() {
	return isIosDevice();
}
function isStandaloneForHint() {
	return isStandaloneApp();
}
function shouldShowInstallHint({ isIos, isStandalone, dismissed } = {}) {
	return Boolean(isIos) && !isStandalone && !dismissed;
}
// hub/web/src/utils/markdown.ts
function renderInlineMarkdown(rawLine) {
	let safe = esc$1(rawLine);
	const htmlBits = [];
	const stash = (html) => {
		htmlBits.push(html);
		return `\u0000PH${htmlBits.length - 1}\u0000`;
	};
	safe = safe.replace(/!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)\n]+)\)/g, (_m, alt, rawSrc) => {
		const cleanAlt = String(alt || "").trim();
		const trimmedSrc = String(rawSrc || "").trim();
		const cleanPath = trimmedSrc.replace(/^file:\/\//i, "").replace(/#L\d+(?:-L?\d+)?$/i, "").trim();
		const pathNoQuery = cleanPath.split("?")[0] || cleanPath;
		const isVideoMedia = /\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/i.test(pathNoQuery) || /^data:video\//i.test(trimmedSrc);
		if (/^(https?:\/\/|data:(?:image|video)\/)/i.test(trimmedSrc)) {
			if (isVideoMedia) return stash(`<span class="md-inline-video-card"><video class="md-inline-video" src="${trimmedSrc}" controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="window.onSmartVideoLoadedMeta && window.onSmartVideoLoadedMeta(this)" onerror="window.onSmartVideoError && window.onSmartVideoError(this)"></video>${cleanAlt ? `<span class="md-inline-img-cap">🎬 ${cleanAlt}</span>` : ""}</span>`);
			return stash(`<span class="md-inline-img-card"><img class="md-inline-img" src="${trimmedSrc}" alt="${cleanAlt}" loading="lazy" />${cleanAlt ? `<span class="md-inline-img-cap">${cleanAlt}</span>` : ""}</span>`);
		}
		const baseName = cleanPath.split("/").filter(Boolean).pop() || cleanPath || (isVideoMedia ? "video" : "image");
		const encodedPath = encodeURIComponent(cleanPath).replace(/'/g, "%27");
		if (isVideoMedia) {
			const cachedVideoSrc = typeof window !== "undefined" && window.__dshInlineVideoCache ? window.__dshInlineVideoCache[cleanPath] : "";
			if (cachedVideoSrc) {
				const cachedHlsSrc = String(cachedVideoSrc).includes("/fs/stream?") ? String(cachedVideoSrc).replace("/fs/stream?", "/fs/hls/index.m3u8?") : "";
				return stash(`<span class="md-inline-video-card"><video class="md-inline-video" data-hls-src="${cachedHlsSrc}" data-fallback-src="${cachedVideoSrc}" controls playsinline webkit-playsinline preload="none" onplay="window.mountSmartVideoElement && window.mountSmartVideoElement(this)" onloadedmetadata="window.onSmartVideoLoadedMeta && window.onSmartVideoLoadedMeta(this)" onerror="window.onSmartVideoError && window.onSmartVideoError(this)"></video><span class="md-inline-img-cap" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')">🎬 ${cleanAlt || esc$1(baseName)} · 点此打开大屏预览</span></span>`);
			}
			return stash(`<span class="md-inline-video-card md-local-video-pending" data-local-video-path="${cleanPath}" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')"><span class="md-local-img-loader">🎬 ${cleanAlt || esc$1(baseName)} · 正在连接视频流…（点此打开播放器）</span></span>`);
		}
		const cachedSrc = typeof window !== "undefined" && window.__dshInlineImgCache ? window.__dshInlineImgCache[cleanPath] : "";
		if (cachedSrc) return stash(`<span class="md-inline-img-card" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')"><img class="md-inline-img" src="${cachedSrc}" alt="${cleanAlt || esc$1(baseName)}" />${cleanAlt ? `<span class="md-inline-img-cap">🖼️ ${cleanAlt}</span>` : ""}</span>`);
		return stash(`<span class="md-inline-img-card md-local-img-pending" data-local-img-path="${cleanPath}" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')"><span class="md-local-img-loader">🖼️ ${cleanAlt || esc$1(baseName)} · 正在从电脑加载图片…（点此直接查看）</span></span>`);
	});
	safe = safe.replace(/\[((?:[^\[\]]|\[[^\]]*\])+)\]\(((?:file:\/\/\/?|\/Users\/|\/home\/|(?!https?:\/\/|mailto:|javascript:)[a-zA-Z0-9_.\-/~]+\.[a-zA-Z0-9]{1,8}(?:#L\d+(?:-L?\d+)?)?)[^)\n]*)\)/g, (_m, rawLabel, rawUrl) => {
		let cleanLabel = String(rawLabel || "").replace(/^`+|`+$/g, "").trim();
		const lineAnchorMatch = /#(L\d+(?:-L?\d+)?)$/i.exec(rawUrl);
		const lineSuffix = lineAnchorMatch ? ` (${lineAnchorMatch[1]})` : "";
		const cleanPath = String(rawUrl || "").replace(/^file:\/\//i, "").replace(/#L\d+(?:-L?\d+)?$/i, "").trim();
		const baseName = cleanPath.split("/").filter(Boolean).pop() || "";
		const stem = baseName.replace(/\.[a-z0-9]+$/i, "");
		const dupMatch = /^([^:：]+)[:：]\s*(.+)$/.exec(cleanLabel);
		if (dupMatch) {
			const left = dupMatch[1].trim();
			const right = dupMatch[2].trim();
			const rightStem = right.replace(/\.[a-z0-9]+$/i, "");
			if (left.toLowerCase() === rightStem.toLowerCase() || left.toLowerCase() === stem.toLowerCase() || left.toLowerCase() === baseName.toLowerCase() || /^(?:artifact|交付文档|walkthrough|implementation plan|task list)$/i.test(left)) cleanLabel = right;
		}
		const encodedPath = encodeURIComponent(cleanPath).replace(/'/g, "%27");
		const isWalkthrough = /walkthrough\.md$/i.test(cleanPath) || /^walkthrough$/i.test(cleanLabel);
		const isPlan = /implementation_plan\.md$/i.test(cleanPath);
		const isHtml = /\.(html?|xhtml)$/i.test(cleanPath);
		const isVideo = /\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/i.test(cleanPath);
		const isImg = /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif|heic|heif)$/i.test(cleanPath);
		const icon = isWalkthrough ? "📋" : isPlan ? "🗺️" : isHtml ? "🌐" : isVideo ? "🎬" : isImg ? "🖼️" : /\.blend$/i.test(cleanPath) ? "🧊" : "📄";
		return stash(`<button type="button" class="md-file-chip${isWalkthrough || isPlan || isHtml ? " md-artifact-chip" : ""}" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')" title="${cleanPath}"><span class="md-file-chip-icon">${icon}</span><span class="md-file-chip-label">${cleanLabel}${lineSuffix}</span></button>`);
	});
	safe = safe.replace(/(^|\s)(?:📋|📄|🗺️)\s*(?=(?:\*\*|__)?\u0000PH\d+\u0000)/g, "$1");
	safe = safe.replace(/`([^`\n]+)`/g, (_m, code) => {
		const trimmedCode = String(code || "").trim();
		if (/^(?:file:\/\/\/?[^\s`]+|\/Users\/[^\s`]+|\/home\/[^\s`]+|~\/[^\s`]+|[a-zA-Z0-9_.\-]+(?:\/[a-zA-Z0-9_.\-]+)*)\.(?:html?|xhtml)$/i.test(trimmedCode)) {
			const cleanPath = trimmedCode.replace(/^file:\/\//i, "");
			const encodedPath = encodeURIComponent(cleanPath).replace(/'/g, "%27");
			return stash(`<button type="button" class="md-file-chip md-artifact-chip" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')" title="${cleanPath}"><span class="md-file-chip-icon">🌐</span><span class="md-file-chip-label">${code}</span></button>`);
		}
		return stash(`<code>${code}</code>`);
	});
	safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => stash(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`));
	safe = safe.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_\n]+)__/g, "<strong>$1</strong>").replace(/\*([^\s*](?:[^*\n]*[^\s*])?)\*/g, "<em>$1</em>");
	return safe.replace(/\u0000PH(\d+)\u0000/g, (_m, idx) => htmlBits[Number(idx)] || "");
}
function renderMarkdownBlocks(rawBlock) {
	const lines = String(rawBlock || "").replace(/\r\n?/g, "\n").split("\n");
	const out = [];
	let paragraph = [];
	let list = null;
	let quote = [];
	const flushParagraph = () => {
		if (!paragraph.length) return;
		out.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (!list) return;
		const itemsHtml = list.items.map((item) => `<li>${item.split("\n").map(renderInlineMarkdown).join("<br>")}</li>`).join("");
		const startAttr = list.type === "ol" && list.start && list.start > 1 ? ` start="${list.start}"` : "";
		out.push(`<${list.type}${startAttr}>${itemsHtml}</${list.type}>`);
		list = null;
	};
	const flushQuote = () => {
		if (!quote.length) return;
		out.push(`<blockquote>${quote.map(renderInlineMarkdown).join("<br>")}</blockquote>`);
		quote = [];
	};
	const flushAll = () => {
		flushParagraph();
		flushList();
		flushQuote();
	};
	const splitTableRow = (line) => {
		let text = line.trim();
		if (text.startsWith("|")) text = text.slice(1);
		if (text.endsWith("|")) text = text.slice(0, -1);
		return text.split("|").map((cell) => cell.trim());
	};
	const isTableRow = (line) => Boolean(line) && line.includes("|") && line.trim() !== "";
	const isTableSep = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex];
		if (!line.trim()) {
			flushAll();
			continue;
		}
		if (isTableRow(line) && lineIndex + 1 < lines.length && isTableSep(lines[lineIndex + 1])) {
			flushAll();
			const headerCells = splitTableRow(line);
			const aligns = splitTableRow(lines[lineIndex + 1]).map((cell) => {
				const left = cell.startsWith(":");
				const right = cell.endsWith(":");
				if (left && right) return "center";
				if (right) return "right";
				return "";
			});
			lineIndex += 1;
			const bodyRows = [];
			while (lineIndex + 1 < lines.length && isTableRow(lines[lineIndex + 1]) && !isTableSep(lines[lineIndex + 1])) {
				lineIndex += 1;
				bodyRows.push(splitTableRow(lines[lineIndex]));
			}
			const cellHtml = (tag, text, index) => {
				return `<${tag}${aligns[index] ? ` style="text-align:${aligns[index]};"` : ""}>${renderInlineMarkdown(text || "")}</${tag}>`;
			};
			out.push(`<div class="md-table-wrap"><table><thead><tr>${headerCells.map((cell, index) => cellHtml("th", cell, index)).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${headerCells.map((_h, index) => cellHtml("td", row[index] || "", index)).join("")}</tr>`).join("")}</tbody></table></div>`);
			continue;
		}
		const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
		if (heading) {
			flushAll();
			const level = heading[1].length;
			out.push(`<div class="md-h${level}">${renderInlineMarkdown(heading[2])}</div>`);
			continue;
		}
		if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
			flushAll();
			out.push("<hr>");
			continue;
		}
		const quoted = /^\s{0,3}>\s?(.*)$/.exec(line);
		if (quoted) {
			flushParagraph();
			flushList();
			quote.push(quoted[1]);
			continue;
		}
		const ulItem = /^\s{0,3}[-*+]\s+(.*)$/.exec(line);
		const olItem = /^\s{0,3}(\d+)[.)]\s+(.*)$/.exec(line);
		if (ulItem || olItem) {
			flushParagraph();
			flushQuote();
			const type = ulItem ? "ul" : "ol";
			let item = ulItem ? ulItem[1] : olItem[2];
			const olStart = olItem ? Number(olItem[1]) || 1 : 1;
			const task = /^\[( |x|X)\]\s+(.*)$/.exec(item);
			if (task) item = `${task[1].toLowerCase() === "x" ? "☑" : "☐"} ${task[2]}`;
			if (!list || list.type !== type) {
				flushList();
				list = {
					type,
					start: olStart,
					items: []
				};
			}
			list.items.push(item);
			continue;
		}
		if (list && /^\s{2,}\S/.test(line)) {
			list.items[list.items.length - 1] += "\n" + line.trim();
			continue;
		}
		flushList();
		flushQuote();
		paragraph.push(line);
	}
	flushAll();
	return out.join("");
}
function renderMarkdown(rawText) {
	let text = String(rawText || "");
	text = text.replace(/````carousel\n?([\s\S]*?)````/g, (_m, inner) => {
		return String(inner || "").replace(/<!--\s*slide\s*-->/gi, "\n---\n");
	});
	if ((text.match(/```/g) || []).length % 2 === 1) text += "\n```";
	const chunks = [];
	const fence = /```([a-zA-Z0-9_+\-]*)\n?([\s\S]*?)```/g;
	let cursor = 0;
	let match;
	while (match = fence.exec(text)) {
		if (match.index > cursor) chunks.push(renderMarkdownBlocks(text.slice(cursor, match.index)));
		const lang = match[1] || "code";
		const code = match[2].replace(/\n$/, "");
		const encoded = encodeURIComponent(code).replace(/'/g, "%27");
		const headerBtnsHtml = (/^(html?|xhtml|svg)$/i.test(lang) || lang === "code" && /^\s*(?:<!doctype\s+html\b|<html\b)/i.test(code)) && /<[a-z!][\s\S]*>/i.test(code) ? `<div style="display:inline-flex;align-items:center;gap:6px;"><button type="button" class="code-copy-btn html-preview-btn" style="color:#60a5fa;font-weight:700;" onclick="openInlineHtmlPreview(this)">🌐 交互预览</button><button type="button" class="code-copy-btn" onclick="copyCodeText('${encoded}')">📋 复制</button></div>` : `<button class="code-copy-btn" onclick="copyCodeText('${encoded}')">📋 复制</button>`;
		chunks.push(`<div class="code-card"><div class="code-card-header"><span>${esc$1(lang)}</span>${headerBtnsHtml}</div><pre>${esc$1(code)}</pre></div>`);
		cursor = fence.lastIndex;
	}
	if (cursor < text.length) chunks.push(renderMarkdownBlocks(text.slice(cursor)));
	return chunks.join("");
}
function stripRedundantInjectedArtifactBlocks(rawText, artifacts = []) {
	const text = String(rawText || "");
	if (!text) return "";
	const list = Array.isArray(artifacts) ? artifacts : [];
	const cardPaths = new Set(list.map((a) => String(a?.path || "").replace(/^file:\/\//i, "").trim()).filter(Boolean));
	const cardNames = new Set(list.map((a) => String(a?.name || "").trim().toLowerCase()).filter(Boolean));
	const paragraphs = text.split(/\n{2,}/);
	const injectedPattern = /^(?:📋\s*)?(?:\*\*)?\[[^\]]+\]\(file:\/\/([^)\n]+)\)(?:\*\*)?(?:\r?\n>\s*[^\r\n]+)*$/;
	return paragraphs.filter((para, idx) => {
		const trimmed = para.trim();
		const m = injectedPattern.exec(trimmed);
		if (!m) return true;
		const targetPath = String(m[1] || "").replace(/^file:\/\//i, "").trim();
		const baseName = (targetPath.split("/").filter(Boolean).pop() || "").toLowerCase();
		if (cardPaths.has(targetPath) || baseName && cardNames.has(baseName)) return false;
		if (baseName) {
			if (paragraphs.some((other, oIdx) => oIdx !== idx && other.toLowerCase().includes(baseName))) return false;
		}
		return true;
	}).join("\n\n").trim();
}
function formatAssistantText(rawText, artifacts = []) {
	return renderMarkdown(stripRedundantInjectedArtifactBlocks(rawText, artifacts));
}
// hub/web/src/utils/html-sandbox.js
function isHtmlFileName(nameOrPath = "") {
	const clean = String(nameOrPath || "").split("?")[0].split("#")[0].trim();
	return /\.(html?|xhtml)$/i.test(clean);
}
function escapeSrcdocAttr(rawHtml) {
	return String(rawHtml ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function resolveRelativeAssetPath(baseFilePath, assetRef) {
	const cleanRef = String(assetRef || "").split("#")[0].split("?")[0].trim();
	if (!cleanRef) return "";
	const normBase = String(baseFilePath || "").replace(/\\/g, "/").trim();
	const isAbs = normBase.startsWith("/");
	const baseParts = normBase.split("/").filter(Boolean);
	if (baseParts.length > 0) baseParts.pop();
	for (const seg of cleanRef.replace(/\\/g, "/").split("/")) {
		if (!seg || seg === ".") continue;
		if (seg === "..") {
			if (baseParts.length > 0) baseParts.pop();
		} else baseParts.push(seg);
	}
	return (isAbs ? "/" : "") + baseParts.join("/");
}
function buildSandboxedHtmlSrcdoc(rawHtml, opts = {}) {
	let html = String(rawHtml || "");
	if (!html.trim()) return "<!doctype html><html><body></body></html>";
	const viewportMeta = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">";
	if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
		if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1>${viewportMeta}`);
		else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html([^>]*)>/i, `<html$1><head>${viewportMeta}</head>`);
		else html = `<!doctype html><html><head><meta charset="utf-8">${viewportMeta}</head><body>${html}</body></html>`;
	}
	if (opts.hostId && opts.mediaTicket) {
		const originPrefix = String(opts.origin || "").replace(/\/+$/, "");
		html = html.replace(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi, (fullMatch, attrName, quote, rawVal) => {
			const trimmed = String(rawVal || "").trim();
			if (!trimmed || /^(?:https?:|\/\/|data:|blob:|mailto:|tel:|javascript:|#|\/)/i.test(trimmed)) return fullMatch;
			const resolvedPath = resolveRelativeAssetPath(opts.relPath || "", trimmed);
			if (!resolvedPath) return fullMatch;
			const qp = new URLSearchParams({ path: resolvedPath });
			if (opts.cwd) qp.set("cwd", opts.cwd);
			if (opts.agentId) qp.set("agentId", opts.agentId);
			qp.set("mt", opts.mediaTicket);
			return `${attrName}=${quote}${`${originPrefix}/api/hosts/${encodeURIComponent(opts.hostId)}/fs/stream?${qp.toString()}`}${quote}`;
		});
	}
	return html;
}
// hub/web/src/utils/filePreview.ts
function appendMediaAuth(rawUrl, mediaTicket = "") {
	if (!rawUrl) return "";
	const mt = mediaTicket || typeof window !== "undefined" && window.getHubState?.()?.mediaTicket || "";
	if (mt) return `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}mt=${encodeURIComponent(mt)}`;
	let tk = "";
	try {
		tk = localStorage.getItem("dsh_hub_token") || "";
	} catch {}
	if (!tk) return rawUrl;
	return `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}`;
}
function buildFastStreamUrl(hostId, relPath, opts = {}) {
	const qp = new URLSearchParams({ path: String(relPath || "") });
	if (opts.cwd) qp.set("cwd", opts.cwd);
	if (opts.agentId) qp.set("agentId", opts.agentId);
	if (opts.thumb) qp.set("thumb", "1");
	if (opts.transcode) qp.set("transcode", "1");
	if (opts.preview) qp.set("preview", "1");
	if (opts.download) qp.set("download", "1");
	if (opts.raw) qp.set("raw", "1");
	return appendMediaAuth(`/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${qp.toString()}`, opts.mediaTicket || "");
}
function previewKind(preview) {
	if (!preview) return "none";
	if (preview.kind === "video" || /\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/i.test(preview.name || preview.relPath || "")) return "video";
	if (preview.kind === "image" && (preview.dataBase64 || preview.streamUrl || preview.previewUrl || preview.hasBlob)) return "image";
	if (preview.kind === "binary") return "binary";
	return "text";
}
function imagePreviewSrc(preview, mediaTicket = "") {
	if (preview.dataBase64) return `data:${preview.mime || "image/png"};base64,${preview.dataBase64}`;
	if (preview.streamUrl) {
		const extLower = String(preview.ext || preview.name || preview.relPath || "").toLowerCase();
		const isHeic = /\.(heic|heif)$/i.test(extLower);
		const canThumb = !preview._origImage && !/\.(svg|gif)$/i.test(extLower) && (isHeic || !preview.size || preview.size > 307200);
		const sep = preview.streamUrl.includes("?") ? "&" : "?";
		return appendMediaAuth(canThumb ? `${preview.streamUrl}${sep}thumb=1` : preview.streamUrl, mediaTicket);
	}
	if (preview.previewUrl) return appendMediaAuth(preview.previewUrl, mediaTicket);
	return "";
}
function videoPreviewSrc(preview, mediaTicket = "") {
	const raw = preview.streamUrl || preview.previewUrl || "";
	if (!raw) return "";
	const sep = raw.includes("?") ? "&" : "?";
	return appendMediaAuth(preview._rawVideo ? `${raw}${sep}raw=1` : preview._transcodeVideo ? `${raw}${sep}transcode=1` : raw, mediaTicket);
}
function videoHlsSrc(preview, mediaTicket = "") {
	if (!preview || preview.hlsAvailable === false || preview._transcodeVideo) return "";
	const raw = preview.streamUrl || "";
	if (!raw || !raw.includes("/fs/stream")) return "";
	const hlsBase = raw.replace("/fs/stream", "/fs/hls/index.m3u8");
	const sep = hlsBase.includes("?") ? "&" : "?";
	return appendMediaAuth(preview._rawVideo ? `${hlsBase}${sep}raw=1` : hlsBase, mediaTicket);
}
function buildBreadcrumbSegments(subDir) {
	const clean = String(subDir || "").replace(/^\/+|\/+$/g, "");
	if (!clean) return [];
	const parts = clean.split("/").filter(Boolean);
	return parts.map((name, index) => ({
		name,
		path: parts.slice(0, index + 1).join("/")
	}));
}
function fileLoadingSpinnerHtml(text) {
	return `<div style="padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;color:#94a3b8;font-size:13.5px;">
    <div class="file-loading-dot"></div>
    <div>${esc$1(text)}</div>
  </div>`;
}
// \0vite/preload-helper.js
var scriptRel = "modulepreload";
var assetsURL = function(dep) {
	return "/" + dep;
};
var seen = {};
var isCssPreloadUrl = function isCssPreloadUrl(url) {
	return url.pathname.endsWith(".css");
};
var preloadOnce = function preloadOnce(seen, href, preload) {
	if (href in seen) return seen[href];
	const promise = preload();
	if (!promise) {
		seen[href] = void 0;
		return;
	}
	const preloadPromise = promise.then(() => {
		seen[href] = void 0;
	}, (err) => {
		seen[href] = void 0;
		throw err;
	});
	seen[href] = preloadPromise;
	return preloadPromise;
};
var __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (deps && deps.length > 0) {
		let preloadedHrefs;
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises) {
			return Promise.all(promises.map((p) => Promise.resolve(p).then((value) => ({
				status: "fulfilled",
				value
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		function importMetaResolve(specifier) {
			if (import.meta.resolve) return new URL(import.meta.resolve(specifier));
			return new URL(
				specifier,
				/** #__KEEP__ */
				import.meta.url
			);
		}
		promise = allSettled(deps.map((depString) => {
			depString = assetsURL(depString, importerUrl);
			const dep = importMetaResolve(depString);
			const isCss = isCssPreloadUrl(dep);
			return preloadOnce(seen, dep.href, () => {
				if (preloadedHrefs === void 0) {
					preloadedHrefs = {
						all: /* @__PURE__ */ new Set(),
						styles: /* @__PURE__ */ new Set()
					};
					const links = document.getElementsByTagName("link");
					for (let i = links.length - 1; i >= 0; i--) {
						const link = links[i];
						preloadedHrefs.all.add(link.href);
						if (link.rel === "stylesheet") preloadedHrefs.styles.add(link.href);
					}
				}
				if ((isCss ? preloadedHrefs.styles : preloadedHrefs.all).has(dep.href)) return;
				const link = document.createElement("link");
				link.rel = isCss ? "stylesheet" : scriptRel;
				if (!isCss) link.as = "script";
				link.crossOrigin = "";
				link.href = dep.href;
				if (cspNonce) link.setAttribute("nonce", cspNonce);
				document.head.appendChild(link);
				if (isCss) return new Promise((res, rej) => {
					link.addEventListener("load", res);
					link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
				});
			});
		}).filter((p) => p !== void 0));
	}
	function handlePreloadError(err) {
		const e = new Event("vite:preloadError", { cancelable: true });
		e.payload = err;
		window.dispatchEvent(e);
		if (!e.defaultPrevented) throw err;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};
// hub/web/src/utils/hlsPlayer.js
var hlsModulePromise = null;
function loadHlsConstructor() {
	if (!hlsModulePromise) hlsModulePromise = __vitePreload(() => import("./vendor-hls.light-DW8pWxy7.js").then((mod) => mod?.default || mod), []).catch(() => null);
	return hlsModulePromise;
}
function isAppleSafariOrIosWebKit() {
	if (typeof navigator === "undefined") return false;
	const ua = navigator.userAgent || "";
	if (/iPad|iPhone|iPod/i.test(ua) || navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints) > 1) return true;
	return /AppleWebKit/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua);
}
function destroyHlsPlayer(videoEl) {
	if (!videoEl) return;
	const existing = videoEl.__dshHlsInstance;
	if (existing) {
		delete videoEl.__dshHlsInstance;
		try {
			existing.destroy();
		} catch {}
	}
}
async function attachSmartHlsPlayer(videoEl, { hlsUrl = "", fallbackSrc = "", onFallback = null } = {}) {
	if (!videoEl) return false;
	destroyHlsPlayer(videoEl);
	if (!hlsUrl) {
		if (fallbackSrc && videoEl.getAttribute("src") !== fallbackSrc) videoEl.src = fallbackSrc;
		return false;
	}
	const canNative = Boolean(videoEl.canPlayType?.("application/vnd.apple.mpegurl") || videoEl.canPlayType?.("application/x-mpegURL"));
	if (canNative && isAppleSafariOrIosWebKit()) {
		videoEl.dataset.dshHlsActive = "native";
		videoEl.src = hlsUrl;
		return true;
	}
	const Hls = await loadHlsConstructor();
	if (!videoEl.isConnected) return false;
	if (Hls && typeof Hls.isSupported === "function" && Hls.isSupported()) {
		const hls = new Hls({
			enableWorker: true,
			lowLatencyMode: false,
			backBufferLength: 30,
			maxBufferLength: 18,
			maxMaxBufferLength: 36,
			manifestLoadingMaxRetry: 2,
			manifestLoadingRetryDelay: 500,
			fragLoadingMaxRetry: 4,
			fragLoadingRetryDelay: 600
		});
		videoEl.__dshHlsInstance = hls;
		videoEl.dataset.dshHlsActive = "mse";
		let mediaRecoveredOnce = false;
		hls.on(Hls.Events.ERROR, (_event, data) => {
			if (!data?.fatal) return;
			if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecoveredOnce) {
				mediaRecoveredOnce = true;
				try {
					hls.recoverMediaError();
					return;
				} catch {}
			}
			destroyHlsPlayer(videoEl);
			delete videoEl.dataset.dshHlsActive;
			if (fallbackSrc && videoEl.isConnected) {
				videoEl.dataset.dshHlsFailed = "1";
				videoEl.src = fallbackSrc;
				try {
					videoEl.load();
				} catch {}
				onFallback?.();
			}
		});
		hls.loadSource(hlsUrl);
		hls.attachMedia(videoEl);
		return true;
	}
	if (canNative) {
		videoEl.dataset.dshHlsActive = "native";
		videoEl.src = hlsUrl;
		return true;
	}
	if (fallbackSrc) videoEl.src = fallbackSrc;
	return false;
}
// hub/web/src/utils/webrtcMedia.js
var DEFAULT_ICE_SERVERS = [{ urls: [
	"stun:stun.qq.com:3478",
	"stun:stun.miwifi.com:3478",
	"stun:stun.cloudflare.com:3478"
] }];
var channelPool = /* @__PURE__ */ new Map();
var recentFailByHost = /* @__PURE__ */ new Map();
function parseStreamUrlDescriptor(rawUrl) {
	if (!rawUrl || typeof rawUrl !== "string") return null;
	try {
		const base = typeof location !== "undefined" && location.origin ? location.origin : "http://localhost";
		const u = new URL(rawUrl, base);
		const m = /^\/api\/hosts\/([^/]+)\/fs\/stream$/.exec(u.pathname);
		if (!m) return null;
		return {
			hostId: decodeURIComponent(m[1]),
			path: u.searchParams.get("path") || "",
			cwd: u.searchParams.get("cwd") || "",
			agentId: u.searchParams.get("agentId") || "",
			thumb: u.searchParams.get("thumb") === "1",
			transcode: u.searchParams.get("transcode") === "1",
			fastPreview: u.searchParams.get("preview") === "1",
			download: u.searchParams.get("download") === "1",
			raw: u.searchParams.get("raw") === "1",
			mt: u.searchParams.get("mt") || ""
		};
	} catch {
		return null;
	}
}
function isWebRtcDataChannelSupported() {
	return typeof window !== "undefined" && typeof window.RTCPeerConnection === "function";
}
function closePoolEntry(hostId, entry) {
	if (!entry || entry.closed) return;
	entry.closed = true;
	if (entry.idleTimer) {
		clearTimeout(entry.idleTimer);
		entry.idleTimer = null;
	}
	if (channelPool.get(hostId) === entry) channelPool.delete(hostId);
	for (const [, pending] of entry.pendingReqs.entries()) pending.reject(/* @__PURE__ */ new Error("WebRTC DataChannel closed"));
	entry.pendingReqs.clear();
	try {
		entry.dc?.close?.();
	} catch {}
	try {
		entry.pc?.close?.();
	} catch {}
}
function touchPoolEntry(hostId, entry) {
	if (!entry || entry.closed) return;
	if (entry.idleTimer) clearTimeout(entry.idleTimer);
	entry.idleTimer = setTimeout(() => {
		if (entry.pendingReqs.size === 0) closePoolEntry(hostId, entry);
	}, 9e4);
}
async function getOrConnectWebRtcChannel(hostId, { cwd = "", agentId = "", mt = "", token = "", connectTimeoutMs = 1600 } = {}) {
	if (!isWebRtcDataChannelSupported() || !hostId) return null;
	const existing = channelPool.get(hostId);
	if (existing && !existing.closed) {
		if (existing.dc && existing.dc.readyState === "open") {
			touchPoolEntry(hostId, existing);
			return existing;
		}
		if (existing.connectPromise) return existing.connectPromise;
	}
	const lastFail = recentFailByHost.get(hostId) || 0;
	if (lastFail > 0 && Date.now() - lastFail < 15e3) return null;
	const entry = {
		hostId,
		pc: null,
		dc: null,
		closed: false,
		idleTimer: null,
		pendingReqs: /* @__PURE__ */ new Map(),
		connectPromise: null
	};
	channelPool.set(hostId, entry);
	entry.connectPromise = (async () => {
		const isLocalhost = typeof location !== "undefined" && (location.hostname === "127.0.0.1" || location.hostname === "localhost");
		const pc = new window.RTCPeerConnection({ iceServers: isLocalhost ? [] : DEFAULT_ICE_SERVERS });
		entry.pc = pc;
		const dc = pc.createDataChannel("dsh-media", { ordered: true });
		dc.binaryType = "arraybuffer";
		entry.dc = dc;
		dc.onmessage = (ev) => {
			touchPoolEntry(hostId, entry);
			if (typeof ev.data === "string") {
				let msg = null;
				try {
					msg = JSON.parse(ev.data);
				} catch {}
				if (!msg || !msg.reqId) return;
				const pending = entry.pendingReqs.get(msg.reqId);
				if (!pending) return;
				if (msg.type === "meta") pending.onMeta(msg);
				else if (msg.type === "eof") pending.onEof(msg);
				else if (msg.type === "error") pending.reject(new Error(msg.error || `P2P HTTP ${msg.status || 500}`));
				return;
			}
			if (ev.data instanceof ArrayBuffer) {
				const u8 = new Uint8Array(ev.data);
				if (u8.byteLength < 3 || u8[0] !== 1) return;
				const idLen = u8[1];
				if (2 + idLen > u8.byteLength) return;
				let reqId = "";
				for (let i = 0; i < idLen; i += 1) reqId += String.fromCharCode(u8[2 + i]);
				const pending = entry.pendingReqs.get(reqId);
				if (pending) pending.onChunk(u8.subarray(2 + idLen));
			}
		};
		dc.onclose = () => closePoolEntry(hostId, entry);
		pc.onconnectionstatechange = () => {
			const st = pc.connectionState;
			if (st === "failed" || st === "closed" || st === "disconnected") closePoolEntry(hostId, entry);
		};
		const dcOpenPromise = new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(/* @__PURE__ */ new Error("P2P connect timeout"));
			}, connectTimeoutMs);
			dc.onopen = () => {
				clearTimeout(timer);
				resolve(true);
			};
			dc.onerror = () => {
				clearTimeout(timer);
				reject(/* @__PURE__ */ new Error("P2P DataChannel error"));
			};
		});
		try {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			const gatherWaitMs = isLocalhost ? 80 : 220;
			await new Promise((resolve) => {
				if (pc.iceGatheringState === "complete") {
					resolve(true);
					return;
				}
				let sawCandidate = false;
				const timer = setTimeout(resolve, gatherWaitMs);
				pc.onicecandidate = (ev) => {
					if (!ev.candidate) {
						clearTimeout(timer);
						resolve(true);
						return;
					}
					if (!sawCandidate && String(ev.candidate.candidate || "").includes("typ srflx")) {
						sawCandidate = true;
						clearTimeout(timer);
						setTimeout(resolve, 40);
					}
				};
				pc.onicegatheringstatechange = () => {
					if (pc.iceGatheringState === "complete") {
						clearTimeout(timer);
						resolve(true);
					}
				};
			});
			const qp = new URLSearchParams();
			if (mt) qp.set("mt", mt);
			const offerUrl = `/api/hosts/${encodeURIComponent(hostId)}/fs/rtc-offer${qp.toString() ? `?${qp.toString()}` : ""}`;
			const headers = {
				"content-type": "application/json",
				...token ? { authorization: `Bearer ${token}` } : {}
			};
			const sigCtrl = typeof AbortController === "function" ? new AbortController() : null;
			const sigTimer = sigCtrl ? setTimeout(() => sigCtrl.abort(), Math.max(1200, connectTimeoutMs)) : null;
			let sigData = null;
			try {
				sigData = await (await fetch(offerUrl, {
					method: "POST",
					headers,
					body: JSON.stringify({
						sdp: pc.localDescription?.sdp || offer.sdp,
						cwd,
						agentId
					}),
					...sigCtrl ? { signal: sigCtrl.signal } : {}
				})).json().catch(() => null);
			} finally {
				if (sigTimer) clearTimeout(sigTimer);
			}
			if (!sigData?.ok || !sigData?.sdp) throw new Error(sigData?.error || "Signaling rejected");
			await pc.setRemoteDescription({
				type: "answer",
				sdp: sigData.sdp
			});
			await dcOpenPromise;
			recentFailByHost.delete(hostId);
			touchPoolEntry(hostId, entry);
			return entry;
		} catch {
			recentFailByHost.set(hostId, Date.now());
			closePoolEntry(hostId, entry);
			return null;
		} finally {
			entry.connectPromise = null;
		}
	})();
	return entry.connectPromise;
}
async function fetchMediaViaWebRtc(rawStreamUrl, { token = "", mediaTicket = "", download = void 0, fastPreview = void 0, raw = void 0, transcode = void 0, maxBytes = 0, connectTimeoutMs = 1600, stallTimeoutMs = 12e3, onProgress = null, signal = null } = {}) {
	const desc = parseStreamUrlDescriptor(rawStreamUrl);
	if (!desc || !desc.path) return null;
	const entry = await getOrConnectWebRtcChannel(desc.hostId, {
		cwd: desc.cwd,
		agentId: desc.agentId,
		mt: mediaTicket || desc.mt,
		token,
		connectTimeoutMs
	});
	if (!entry || !entry.dc || entry.dc.readyState !== "open") return null;
	if (signal?.aborted) return null;
	const reqId = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	return new Promise((resolve) => {
		const chunks = [];
		let received = 0;
		let totalBytes = 0;
		let metaInfo = null;
		let settled = false;
		let stallTimer = null;
		const resetStall = () => {
			if (stallTimer) clearTimeout(stallTimer);
			stallTimer = setTimeout(() => {
				finish(null, true);
			}, stallTimeoutMs);
		};
		const onAbort = () => finish(null, true);
		const finish = (result, sendCancel = false) => {
			if (settled) return;
			settled = true;
			if (stallTimer) clearTimeout(stallTimer);
			entry.pendingReqs.delete(reqId);
			if (signal && typeof signal.removeEventListener === "function") try {
				signal.removeEventListener("abort", onAbort);
			} catch {}
			if (sendCancel && entry.dc?.readyState === "open") try {
				entry.dc.send(JSON.stringify({
					op: "cancel",
					reqId
				}));
			} catch {}
			resolve(result);
		};
		if (signal && typeof signal.addEventListener === "function") signal.addEventListener("abort", onAbort, { once: true });
		entry.pendingReqs.set(reqId, {
			onMeta(meta) {
				metaInfo = meta;
				totalBytes = Number(meta.byteLength || 0);
				if (maxBytes > 0 && totalBytes > maxBytes) {
					finish(null, true);
					return;
				}
				resetStall();
				onProgress?.({
					received,
					totalBytes
				});
			},
			onChunk(slice) {
				resetStall();
				const copy = new Uint8Array(slice.byteLength);
				copy.set(slice);
				chunks.push(copy);
				received += copy.byteLength;
				onProgress?.({
					received,
					totalBytes
				});
			},
			onEof(eofMsg) {
				const expected = Number(eofMsg?.byteLength ?? totalBytes);
				if (expected > 0 && received !== expected) {
					finish(null, false);
					return;
				}
				const mime = metaInfo?.mime || "video/mp4";
				const blob = new Blob(chunks, { type: mime });
				finish({
					ok: true,
					blob,
					byteLength: received,
					mime,
					name: metaInfo?.name || "",
					variant: metaInfo?.variant || "orig"
				});
			},
			reject() {
				finish(null, false);
			}
		});
		resetStall();
		try {
			entry.dc.send(JSON.stringify({
				op: "stream",
				reqId,
				path: desc.path,
				cwd: desc.cwd,
				agentId: desc.agentId,
				thumb: desc.thumb,
				transcode: transcode !== void 0 ? Boolean(transcode) : desc.transcode,
				fastPreview: fastPreview !== void 0 ? Boolean(fastPreview) : desc.fastPreview,
				download: download !== void 0 ? Boolean(download) : desc.download,
				raw: raw !== void 0 ? Boolean(raw) : desc.raw
			}));
		} catch {
			finish(null, false);
		}
	});
}
// hub/web/src/utils/gestures.ts
function composerUsesCoarsePointer() {
	try {
		return window.matchMedia("(pointer: coarse)").matches;
	} catch {
		return false;
	}
}
function shouldSendOnEnter({ shiftKey, isComposing, coarsePointer } = {}) {
	if (isComposing) return false;
	if (shiftKey) return false;
	return !coarsePointer;
}
function shouldDismissHorizontalSwipe({ dx = 0, dy = 0, width = 375, durationMs = 1, minVelocity = .5 } = {}) {
	if (!(dx > 0)) return false;
	if (Math.abs(dy) > dx) return false;
	if (dx >= Math.min(Math.max(90, (width || 375) * .28), 160)) return true;
	return dx / Math.max(1, durationMs || 1) >= minVelocity;
}
function shouldDismissVerticalSwipe({ dy = 0, dx = 0, height = 480, durationMs = 1, minVelocity = .5 } = {}) {
	if (!(dy > 0)) return false;
	if (Math.abs(dx) > dy) return false;
	if (dy >= Math.min(Math.max(80, (height || 480) * .2), 150)) return true;
	return dy / Math.max(1, durationMs || 1) >= minVelocity;
}
// hub/web/src/hooks/useVoiceInput.ts
var activeVoiceRecognition = null;
var activeVoiceInputId = "";
var activeVoiceBtnId = "";
var voiceSessionActive = false;
var voiceWatchdogTimer = null;
var voiceRestartTimer = null;
var voiceHintTimer = null;
var webSpeechServiceBlocked = false;
var wechatVoiceMode = false;
var returnToVoiceAfterSend = false;
var holdActive = false;
var holdStopping = false;
var holdFinalized = false;
var holdZone = "send";
var holdStartY = 0;
var holdStartAt = 0;
var holdBaseDraft = "";
var holdCommittedText = "";
var holdRawChunkText = "";
var holdPauseBreakpoints = [];
var holdSpokenText = "";
var holdHadFatalError = false;
var holdFinalizeTimer = null;
var holdSettleTimer = null;
var holdLastResultWasFinal = false;
var holdLastResultAt = 0;
var voicePauseTimer = null;
var holdListenersBound = false;
var activeHoldDeps = null;
var dictationStopping = false;
var activeDictationFlushHandler = null;
var dictationFinalizeFn = null;
var dictationFinalizeResolve = null;
var dictationFinalizeTimer = null;
var dictationSettleTimer = null;
var CJK_CHAR_RE = /[\u4e00-\u9fa5]/;
var PUNCT_OR_SPACE_RE = /[，。！？、；：,.!?;:\s…~～—\-()（）[\]【】"'“”‘’]/;
var LEADING_PARTICLE_RE = /^[的了着过吗呢吧啊呀呗嘛嘞啦]/;
function isChineseQuestionClause(clause) {
	const s = String(clause || "").trim();
	if (!s || !CJK_CHAR_RE.test(s[s.length - 1])) return false;
	if (/[吗么]$/.test(s)) return true;
	if (/^(不管|无论|不论)/.test(s)) return false;
	if (/^(请|麻烦|你先|先)?(帮我|看看|看下|查查|查一下|查下|检查|排查|确认|统计|分析|测试)/.test(s)) return /(好不好|行不行|对不对|可不可以|能不能)$/.test(s);
	return /(为什么|怎么|怎樣|怎样|是不是|能不能|可不可以|行不行|好不好|对不对|有没有|要不要|会不会|算不算|哪里|哪儿|哪个|哪些|多少|几[个条次天秒分点]|什么|谁|咋)/.test(s);
}
function smartSeparatorBetween(leftText, rightText) {
	const prevChar = leftText ? leftText[leftText.length - 1] : "";
	const nextChar = rightText ? rightText[0] : "";
	if (!prevChar || !nextChar) return "";
	if (PUNCT_OR_SPACE_RE.test(prevChar) || PUNCT_OR_SPACE_RE.test(nextChar) || LEADING_PARTICLE_RE.test(rightText)) return "";
	if (CJK_CHAR_RE.test(prevChar) && CJK_CHAR_RE.test(nextChar)) return isChineseQuestionClause(leftText.split(/[，。！？；,.!?;]/).pop() || leftText) ? "？" : "，";
	if (/[A-Za-z0-9]/.test(prevChar) && /[A-Za-z0-9]/.test(nextChar)) return " ";
	if (CJK_CHAR_RE.test(prevChar) && /[A-Za-z0-9]/.test(nextChar) || /[A-Za-z0-9]/.test(prevChar) && CJK_CHAR_RE.test(nextChar)) return " ";
	return "";
}
function punctuateSpeechText(rawText, pauseBreakpoints = null, options = null) {
	const raw = String(rawText || "");
	if (!raw) return "";
	const showTrailingPause = Boolean(options?.showTrailingPause);
	const finalizeSentence = Boolean(options?.finalizeSentence);
	const validCuts = [];
	if (Array.isArray(pauseBreakpoints)) for (let i = 0; i < pauseBreakpoints.length; i += 1) {
		const bp = pauseBreakpoints[i];
		const len = Number(bp?.len) || 0;
		const head = String(bp?.head || "");
		if (len < 2 || len > raw.length) continue;
		if (head && raw.slice(0, head.length) !== head) continue;
		if (len < raw.length) validCuts.push(len);
		else if (len === raw.length && showTrailingPause && !finalizeSentence) validCuts.push(len);
	}
	validCuts.sort((a, b) => a - b);
	let stitched = "";
	let lastIdx = 0;
	for (let i = 0; i < validCuts.length; i += 1) {
		const cut = validCuts[i];
		if (cut <= lastIdx) continue;
		stitched += raw.slice(lastIdx, cut);
		const nextRest = raw.slice(cut);
		if (nextRest) stitched += smartSeparatorBetween(stitched, nextRest);
		else if (showTrailingPause && !finalizeSentence) {
			const prevChar = stitched[stitched.length - 1] || "";
			if (CJK_CHAR_RE.test(prevChar) && !PUNCT_OR_SPACE_RE.test(prevChar)) {
				const lastClause = stitched.split(/[，。！？；,.!?;]/).pop() || stitched;
				stitched += isChineseQuestionClause(lastClause) ? "？" : "，";
			}
		}
		lastIdx = cut;
	}
	if (lastIdx < raw.length) stitched += raw.slice(lastIdx);
	stitched = stitched.replace(/([\u4e00-\u9fa5]{3,}吗)(?![啡丁了呢啊呀吧呗嘛的，。！？、；：,.!?;:\s])(?=[\u4e00-\u9fa5]{2,})/g, "$1？");
	if (finalizeSentence) {
		stitched = stitched.replace(/[，、]+$/, "");
		const trimmed = stitched.trim();
		const tailChar = trimmed[trimmed.length - 1] || "";
		if (trimmed && CJK_CHAR_RE.test(tailChar) && !PUNCT_OR_SPACE_RE.test(tailChar)) {
			if (isChineseQuestionClause(trimmed.split(/[，。！？；,.!?;]/).pop() || trimmed)) stitched = trimmed + "？";
			else if (/[，。！？；]/.test(trimmed) || trimmed.length >= 10) stitched = trimmed + "。";
		}
	}
	return stitched;
}
function pickBestAlternative(resultItem) {
	if (!resultItem) return "";
	const alt0 = resultItem[0];
	let bestText = String(alt0?.transcript || "");
	let bestConf = Number(alt0?.confidence) || 0;
	const maxCheck = Math.min(4, Math.max(Number(resultItem?.length) || 0, 4));
	for (let k = 1; k < maxCheck; k += 1) {
		const cand = resultItem[k];
		if (!cand) continue;
		const candText = String(cand?.transcript || "");
		if (!candText.trim()) continue;
		if (!bestText.trim()) {
			bestText = candText;
			bestConf = Number(cand?.confidence) || 0;
			continue;
		}
		const candConf = Number(cand?.confidence) || 0;
		if (Boolean(resultItem?.isFinal) && bestConf > 0 && candConf > bestConf + .01) {
			bestText = candText;
			bestConf = candConf;
		}
	}
	return bestText;
}
function areAllSpeechResultsFinal(results) {
	const total = results ? results.length : 0;
	let hasAnyText = false;
	for (let i = 0; i < total; i += 1) {
		if (!pickBestAlternative(results[i]).trim()) continue;
		hasAnyText = true;
		if (!results[i]?.isFinal) return false;
	}
	return hasAnyText;
}
function commonPrefixLength(a, b) {
	const max = Math.min(a.length, b.length);
	let i = 0;
	while (i < max && a[i] === b[i]) i += 1;
	return i;
}
function longestCommonSubstringLength(a, b) {
	if (!a || !b) return 0;
	const s1 = a.slice(0, 160);
	const s2 = b.slice(0, 160);
	const prev = new Array(s2.length + 1).fill(0);
	let best = 0;
	for (let i = 1; i <= s1.length; i += 1) for (let j = s2.length; j >= 1; j -= 1) if (s1[i - 1] === s2[j - 1]) {
		prev[j] = prev[j - 1] + 1;
		if (prev[j] > best) best = prev[j];
	} else prev[j] = 0;
	return best;
}
function longestCommonSubsequenceLength(a, b) {
	if (!a || !b) return 0;
	const s1 = a.slice(0, 160);
	const s2 = b.slice(0, 160);
	const dp = new Array(s2.length + 1).fill(0);
	for (let i = 1; i <= s1.length; i += 1) {
		let prevDiag = 0;
		for (let j = 1; j <= s2.length; j += 1) {
			const temp = dp[j];
			if (s1[i - 1] === s2[j - 1]) dp[j] = prevDiag + 1;
			else if (dp[j - 1] > dp[j]) dp[j] = dp[j - 1];
			prevDiag = temp;
		}
	}
	return dp[s2.length];
}
function isCumulativeReplacement(acc, seg, prevWasInterim) {
	const l1 = acc.length;
	const l2 = seg.length;
	if (l1 < 4 || l2 < 4 || l2 < l1 - 1) return false;
	if (!prevWasInterim && l2 < l1 + 2) return false;
	const segHead = seg.slice(0, Math.min(l2, l1 + 4));
	const prefLen = commonPrefixLength(acc, segHead);
	const subLen = longestCommonSubstringLength(acc, segHead);
	if (prefLen < 3 && !(prefLen >= 2 && subLen >= 3) && subLen < 4) return false;
	const lcsLen = longestCommonSubsequenceLength(acc, segHead);
	if (lcsLen / l1 < .72) return false;
	if (l2 <= l1 + 1) {
		const tailMatches = acc[l1 - 1] === segHead[segHead.length - 1];
		return prefLen >= 2 && tailMatches || subLen >= 5 || lcsLen / l1 >= .85;
	}
	return true;
}
function mergeSpeechResults(results) {
	const total = results ? results.length : 0;
	let acc = "";
	let lastNonEmptyWasInterim = false;
	for (let i = 0; i < total; i += 1) {
		const seg = pickBestAlternative(results[i]);
		if (!seg) continue;
		if (!acc) acc = seg;
		else if (seg.startsWith(acc)) acc = seg;
		else if (isCumulativeReplacement(acc, seg, lastNonEmptyWasInterim)) acc = seg;
		else if (acc.endsWith(seg) && seg.length >= 2) {} else {
			let overlap = 0;
			const maxK = Math.min(acc.length, seg.length);
			for (let k = maxK; k >= 4; k -= 1) if (acc.slice(acc.length - k) === seg.slice(0, k)) {
				overlap = k;
				break;
			}
			if (overlap > 0) acc += seg.slice(overlap);
			else acc += smartSeparatorBetween(acc, seg) + seg;
		}
		lastNonEmptyWasInterim = results[i]?.isFinal === false;
	}
	return acc;
}
function joinDraftAndSpeech(draft, speech) {
	const d = String(draft || "").trim();
	const s = String(speech || "").trim();
	if (!d) return s;
	if (!s) return d;
	return d + smartSeparatorBetween(d, s) + s;
}
function computeHoldZone(clientX, clientY, viewportWidth, viewportHeight, startY) {
	const vw = Number(viewportWidth) || 390;
	const vh = Number(viewportHeight) || 844;
	const sy = Number(startY) || vh - 52;
	const x = Number(clientX) || 0;
	const y = Number(clientY) || 0;
	if (sy - y < 54 && y > vh - 116) return "send";
	return x < vw * .5 ? "cancel" : "edit";
}
function resolveSpeechLang() {
	const nav = typeof navigator !== "undefined" ? navigator : null;
	const rawLang = String(nav?.language || "").toLowerCase();
	let preferEn = false;
	try {
		preferEn = typeof localStorage !== "undefined" && localStorage.getItem("dsh_lang_pref") === "en" && rawLang.startsWith("en");
	} catch {}
	return preferEn ? String(nav.language) : rawLang.startsWith("zh-tw") || rawLang.startsWith("zh-hant") ? "zh-TW" : rawLang.startsWith("zh-hk") ? "zh-HK" : "zh-CN";
}
function resolveHintBarId(targetInputId) {
	return targetInputId === "newTaskInput" ? "newTaskVoiceHintBar" : "chatVoiceHintBar";
}
function hideVoiceHintBar(targetInputId = "") {
	if (voiceHintTimer) {
		clearTimeout(voiceHintTimer);
		voiceHintTimer = null;
	}
	const ids = targetInputId ? [resolveHintBarId(targetInputId)] : ["chatVoiceHintBar", "newTaskVoiceHintBar"];
	for (let i = 0; i < ids.length; i += 1) {
		const bar = document.getElementById(ids[i]);
		if (bar) {
			bar.style.display = "none";
			bar.classList.remove("recording", "fallback");
			bar.textContent = "";
		}
	}
}
function showVoiceHintBar(targetInputId, msg, mode, autoHideMs) {
	if (voiceHintTimer) {
		clearTimeout(voiceHintTimer);
		voiceHintTimer = null;
	}
	const bar = document.getElementById(resolveHintBarId(targetInputId));
	if (!bar) return;
	bar.textContent = msg;
	bar.classList.remove("recording", "fallback");
	bar.classList.add(mode === "recording" ? "recording" : "fallback");
	bar.style.display = "flex";
	if (autoHideMs) voiceHintTimer = setTimeout(() => {
		if (bar.classList.contains("fallback")) bar.style.display = "none";
	}, autoHideMs);
}
function focusInputWithVisualPulse(input, targetInputId, hintMsg, showToast) {
	try {
		if (!(typeof document !== "undefined" && document && document.activeElement === input)) {
			if (typeof input.focus === "function") input.focus();
			const len = String(input.value || "").length;
			if (typeof input.setSelectionRange === "function") input.setSelectionRange(len, len);
		}
	} catch {}
	try {
		const card = input.closest ? input.closest(".composer-unified-card") || input : input;
		if (card && card.classList) {
			card.classList.remove("composer-voice-flash");
			card.classList.add("composer-voice-flash");
			setTimeout(() => {
				try {
					card.classList.remove("composer-voice-flash");
				} catch {}
			}, 900);
		}
	} catch {}
	showVoiceHintBar(targetInputId, hintMsg, "fallback", 6500);
	showToast(hintMsg);
}
function setVoiceBtnRecording(btnId, recording) {
	const btn = document.getElementById(btnId);
	if (!btn) return;
	btn.classList.toggle("recording", Boolean(recording));
	btn.setAttribute("aria-pressed", recording ? "true" : "false");
	if (btn.classList.contains("mode-toggle-btn")) btn.textContent = wechatVoiceMode ? "⌨️ 打字" : "🎙️ 语音";
	else if (btn.classList.contains("voice-pill-btn")) btn.textContent = recording ? "⏹ 停止听写" : "🎤 语音输入";
	else if (btn.id === "newTaskVoiceBtn" || btn.classList.contains("new-task-tool-btn")) btn.textContent = recording ? "⏹ 停止" : "🎤 语音";
	else btn.textContent = recording ? "⏹" : "🎤";
}
function isVoiceRecording() {
	return Boolean(holdActive || holdStopping || dictationStopping || voiceSessionActive || activeVoiceRecognition || activeVoiceBtnId);
}
function isWechatVoiceMode() {
	return wechatVoiceMode;
}
function consumeReturnToVoiceAfterSend() {
	const shouldReturn = returnToVoiceAfterSend;
	returnToVoiceAfterSend = false;
	return shouldReturn;
}
function syncWechatHoldBtnState() {
	if (typeof document === "undefined" || !document) return;
	const input = document.getElementById("globalPromptInput");
	const holdBtn = document.getElementById("wechatHoldTalkBtn");
	const holdLabel = document.getElementById("wechatHoldTalkLabel");
	if (!holdBtn) return;
	const isLocked = Boolean(input && (input.disabled || input.readOnly));
	const ph = String(input?.placeholder || "");
	if (holdActive || holdStopping) {
		holdBtn.classList.add("holding");
		holdBtn.classList.remove("is-disabled");
		if (holdLabel) {
			if (holdZone === "cancel") holdLabel.textContent = "🔴 松开 取消发送";
			else if (holdZone === "edit") holdLabel.textContent = "🔵 松开 填入输入框改字";
			else holdLabel.textContent = "🟢 松开 立即发送";
		}
		return;
	}
	holdBtn.classList.remove("holding");
	if (isLocked) {
		holdBtn.classList.add("is-disabled");
		if (holdLabel) holdLabel.textContent = ph.includes("观察") ? "👀 当前为观察模式（仅查看）" : "⏳ AI 执行中（暂不可说话）";
	} else {
		holdBtn.classList.remove("is-disabled");
		if (holdLabel) holdLabel.textContent = ph.includes("插话") ? "🎙️ 按住 说话（实时插话）" : "🎙️ 按住 说话";
	}
}
function updateWechatOverlayUI() {
	if (typeof document === "undefined" || !document) return;
	const overlay = document.getElementById("wechatVoiceOverlay");
	if (overlay) {
		const visible = Boolean(holdActive || holdStopping);
		overlay.style.display = visible ? "flex" : "none";
		if (visible) {
			overlay.classList.remove("zone-send", "zone-cancel", "zone-edit");
			overlay.classList.add(holdZone === "cancel" ? "zone-cancel" : holdZone === "edit" ? "zone-edit" : "zone-send");
			const cancelEl = document.getElementById("wechatZoneCancel");
			const editEl = document.getElementById("wechatZoneEdit");
			if (cancelEl) cancelEl.classList.toggle("active", holdZone === "cancel");
			if (editEl) editEl.classList.toggle("active", holdZone === "edit");
			const trEl = document.getElementById("wechatOverlayTranscript");
			if (trEl) {
				const liveText = joinDraftAndSpeech(holdBaseDraft, holdSpokenText);
				if (liveText) {
					trEl.textContent = liveText;
					trEl.classList.remove("is-placeholder");
				} else {
					trEl.textContent = "正在听你说话…";
					trEl.classList.add("is-placeholder");
				}
			}
			const statusEl = document.getElementById("wechatOverlayStatus");
			if (statusEl) {
				if (holdStopping) statusEl.textContent = holdZone === "edit" ? "正在转文字…" : "正在发送…";
				else if (holdZone === "cancel") statusEl.textContent = "松开手指，取消发送";
				else if (holdZone === "edit") statusEl.textContent = "松开手指，填入输入框修改";
				else statusEl.textContent = "松开 立即发送";
			}
		}
	}
	syncWechatHoldBtnState();
}
function setWechatVoiceMode(enabled, persist = true, focusText = false) {
	wechatVoiceMode = Boolean(enabled);
	if (persist) {
		returnToVoiceAfterSend = false;
		try {
			if (typeof localStorage !== "undefined") localStorage.setItem("dsh_voice_mode", wechatVoiceMode ? "1" : "0");
		} catch {}
	}
	if (!wechatVoiceMode && (holdActive || holdStopping)) cancelHoldVoice();
	if (wechatVoiceMode && voiceSessionActive && !holdActive) stopVoiceInput();
	if (typeof document !== "undefined" && document) {
		const card = document.getElementById("composerUnifiedCard");
		if (card && card.classList) card.classList.toggle("wechat-voice-mode", wechatVoiceMode);
		const modeBtn = document.getElementById("chatVoiceBtn");
		if (modeBtn && modeBtn.classList && modeBtn.classList.contains("mode-toggle-btn")) {
			modeBtn.textContent = wechatVoiceMode ? "⌨️ 打字" : "🎙️ 语音";
			modeBtn.setAttribute("aria-pressed", wechatVoiceMode ? "true" : "false");
			modeBtn.setAttribute("title", wechatVoiceMode ? "切换为键盘打字输入" : "切换为微信式按住说话");
			modeBtn.setAttribute("aria-label", wechatVoiceMode ? "切换为键盘打字输入" : "切换为微信式按住说话");
		}
		syncWechatHoldBtnState();
		if (!wechatVoiceMode && focusText) {
			const input = document.getElementById("globalPromptInput");
			if (input) {
				try {
					if (typeof input.focus === "function") input.focus();
					const len = String(input.value || "").length;
					if (typeof input.setSelectionRange === "function") input.setSelectionRange(len, len);
				} catch {}
				const win = typeof window !== "undefined" ? window : null;
				if (win && typeof win.autoGrowComposer === "function") win.autoGrowComposer();
			}
		}
	}
}
function toggleWechatVoiceMode() {
	setWechatVoiceMode(!wechatVoiceMode, true, wechatVoiceMode);
}
function initWechatVoiceMode() {
	let saved = null;
	try {
		if (typeof localStorage !== "undefined") saved = localStorage.getItem("dsh_voice_mode");
	} catch {}
	let preferVoice = false;
	if (saved === "1") preferVoice = true;
	else if (saved === "0") preferVoice = false;
	else {
		const nav = typeof navigator !== "undefined" ? navigator : null;
		const win = typeof window !== "undefined" ? window : null;
		preferVoice = Boolean(nav && Number(nav.maxTouchPoints) > 0) && Boolean(win && (Number(win.innerWidth) || 390) <= 820);
	}
	const input = typeof document !== "undefined" && document ? document.getElementById("globalPromptInput") : null;
	if (Boolean(input && String(input.value || "").trim().length > 0) && preferVoice) {
		returnToVoiceAfterSend = true;
		setWechatVoiceMode(false, false, false);
	} else setWechatVoiceMode(preferVoice, false, false);
}
function handleWindowTouchMove(e) {
	if (!holdActive) return;
	if (e && typeof e.preventDefault === "function") try {
		e.preventDefault();
	} catch {}
	const t = e?.touches?.[0] || e?.changedTouches?.[0];
	if (t) moveHoldVoice(t.clientX, t.clientY);
}
function handleWindowTouchEnd(e) {
	if (!holdActive) return;
	const t = e?.changedTouches?.[0];
	if (t) moveHoldVoice(t.clientX, t.clientY);
	endHoldVoice();
}
function handleWindowTouchCancel() {
	if (!holdActive) return;
	cancelHoldVoice();
}
function handleWindowMouseMove(e) {
	if (!holdActive) return;
	if (e) moveHoldVoice(e.clientX, e.clientY);
}
function handleWindowMouseUp(e) {
	if (!holdActive) return;
	if (e) moveHoldVoice(e.clientX, e.clientY);
	endHoldVoice();
}
function handleWindowBlur() {
	if (holdActive || holdStopping) cancelHoldVoice();
}
function attachHoldWindowListeners() {
	if (holdListenersBound || typeof window === "undefined" || !window.addEventListener) return;
	holdListenersBound = true;
	try {
		window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
		window.addEventListener("touchend", handleWindowTouchEnd, { passive: false });
		window.addEventListener("touchcancel", handleWindowTouchCancel);
		window.addEventListener("mousemove", handleWindowMouseMove);
		window.addEventListener("mouseup", handleWindowMouseUp);
		window.addEventListener("blur", handleWindowBlur);
	} catch {}
}
function detachHoldWindowListeners() {
	if (!holdListenersBound || typeof window === "undefined" || !window.removeEventListener) return;
	holdListenersBound = false;
	try {
		window.removeEventListener("touchmove", handleWindowTouchMove);
		window.removeEventListener("touchend", handleWindowTouchEnd);
		window.removeEventListener("touchcancel", handleWindowTouchCancel);
		window.removeEventListener("mousemove", handleWindowMouseMove);
		window.removeEventListener("mouseup", handleWindowMouseUp);
		window.removeEventListener("blur", handleWindowBlur);
	} catch {}
}
function forceAbortActiveRecognition() {
	const rec = activeVoiceRecognition;
	activeVoiceRecognition = null;
	if (rec) {
		try {
			rec.onresult = null;
			rec.onerror = null;
			rec.onend = null;
		} catch {}
		try {
			rec.abort();
		} catch {}
		try {
			rec.stop();
		} catch {}
	}
}
function stopVoiceInput() {
	voiceSessionActive = false;
	holdActive = false;
	holdStopping = false;
	holdFinalized = true;
	dictationStopping = false;
	activeDictationFlushHandler = null;
	dictationFinalizeFn = null;
	const pendingResolve = dictationFinalizeResolve;
	dictationFinalizeResolve = null;
	detachHoldWindowListeners();
	if (voicePauseTimer) {
		clearTimeout(voicePauseTimer);
		voicePauseTimer = null;
	}
	if (holdSettleTimer) {
		clearTimeout(holdSettleTimer);
		holdSettleTimer = null;
	}
	if (holdFinalizeTimer) {
		clearTimeout(holdFinalizeTimer);
		holdFinalizeTimer = null;
	}
	if (dictationSettleTimer) {
		clearTimeout(dictationSettleTimer);
		dictationSettleTimer = null;
	}
	if (dictationFinalizeTimer) {
		clearTimeout(dictationFinalizeTimer);
		dictationFinalizeTimer = null;
	}
	if (voiceRestartTimer) {
		clearTimeout(voiceRestartTimer);
		voiceRestartTimer = null;
	}
	if (voiceWatchdogTimer) {
		clearTimeout(voiceWatchdogTimer);
		voiceWatchdogTimer = null;
	}
	const btnId = activeVoiceBtnId;
	activeVoiceInputId = "";
	activeVoiceBtnId = "";
	if (btnId) setVoiceBtnRecording(btnId, false);
	setVoiceBtnRecording("chatVoiceBtn", false);
	setVoiceBtnRecording("newTaskVoiceBtn", false);
	hideVoiceHintBar();
	updateWechatOverlayUI();
	forceAbortActiveRecognition();
	if (pendingResolve) pendingResolve();
}
function finalizeHoldSession() {
	if (holdFinalized) return;
	holdFinalized = true;
	if (voicePauseTimer) {
		clearTimeout(voicePauseTimer);
		voicePauseTimer = null;
	}
	if (holdSettleTimer) {
		clearTimeout(holdSettleTimer);
		holdSettleTimer = null;
	}
	if (holdFinalizeTimer) {
		clearTimeout(holdFinalizeTimer);
		holdFinalizeTimer = null;
	}
	if (voiceRestartTimer) {
		clearTimeout(voiceRestartTimer);
		voiceRestartTimer = null;
	}
	if (voiceWatchdogTimer) {
		clearTimeout(voiceWatchdogTimer);
		voiceWatchdogTimer = null;
	}
	const finalZone = holdZone;
	const finalizedChunk = holdRawChunkText ? punctuateSpeechText(holdRawChunkText, holdPauseBreakpoints, { finalizeSentence: false }) : "";
	const combinedRaw = finalizedChunk ? holdCommittedText ? joinDraftAndSpeech(holdCommittedText, finalizedChunk) : finalizedChunk : holdSpokenText;
	const spoken = String(punctuateSpeechText(combinedRaw, null, { finalizeSentence: true })).trim();
	const baseDraft = holdBaseDraft;
	const durationMs = Date.now() - holdStartAt;
	const hadFatal = holdHadFatalError;
	const deps = activeHoldDeps;
	voiceSessionActive = false;
	holdActive = false;
	holdStopping = false;
	activeHoldDeps = null;
	detachHoldWindowListeners();
	forceAbortActiveRecognition();
	updateWechatOverlayUI();
	const win = typeof window !== "undefined" ? window : null;
	const showToast = deps?.showToast || (win && win.showToast ? win.showToast : () => {});
	const onComposerInput = deps?.onComposerInput || (win && win.onComposerInput ? win.onComposerInput : () => {});
	const sendPrompt = deps?.sendPrompt || (win && win.sendPromptToActiveSession ? win.sendPromptToActiveSession : () => {});
	const input = typeof document !== "undefined" && document ? document.getElementById("globalPromptInput") : null;
	if (!spoken) {
		if (input) input.value = baseDraft;
		if (!hadFatal && durationMs >= 450) showToast("🎙️ 未听到说话内容，请按住重试");
		return;
	}
	const mergedText = joinDraftAndSpeech(baseDraft, spoken);
	if (finalZone === "edit") {
		if (input) input.value = mergedText;
		returnToVoiceAfterSend = true;
		setWechatVoiceMode(false, false, true);
		onComposerInput();
		showToast("✍️ 已转为文字，修改后点「发送」即可");
		return;
	}
	if (input) input.value = mergedText;
	onComposerInput();
	sendPrompt();
}
function startHoldVoice(startX, startY, deps) {
	const win = typeof window !== "undefined" ? window : null;
	const nav = typeof navigator !== "undefined" ? navigator : null;
	const showToast = deps?.showToast || (win && win.showToast ? win.showToast : () => {});
	const input = typeof document !== "undefined" && document ? document.getElementById("globalPromptInput") : null;
	if (!input) return false;
	if (input.disabled || input.readOnly) {
		showToast("⏳ 当前会话正在执行或为观察模式，暂不可说话");
		return false;
	}
	const SpeechRecognitionCtor = win && (win.SpeechRecognition || win.webkitSpeechRecognition);
	if (!SpeechRecognitionCtor || webSpeechServiceBlocked) {
		const fallbackMsg = webSpeechServiceBlocked ? "🎙️ 桌面图标模式受苹果限制无法按住说话：请用 Safari 打开，或点键盘右下角「🎤」说话" : "🎙️ 当前浏览器不支持直接语音识别，已切回键盘，请用键盘「🎤」说话";
		setWechatVoiceMode(false, false, true);
		focusInputWithVisualPulse(input, "globalPromptInput", fallbackMsg, showToast);
		return false;
	}
	if (holdStopping && !holdFinalized) finalizeHoldSession();
	if (voiceSessionActive || activeVoiceRecognition || holdActive) stopVoiceInput();
	const vh = Number(win?.innerHeight) || 844;
	holdActive = true;
	holdStopping = false;
	holdFinalized = false;
	holdZone = "send";
	holdStartY = Number(startY) || vh - 52;
	holdStartAt = Date.now();
	holdBaseDraft = String(input.value || "").trim();
	holdCommittedText = "";
	holdRawChunkText = "";
	holdPauseBreakpoints = [];
	holdSpokenText = "";
	holdHadFatalError = false;
	holdLastResultWasFinal = false;
	holdLastResultAt = 0;
	activeHoldDeps = deps || null;
	voiceSessionActive = true;
	activeVoiceInputId = "globalPromptInput";
	try {
		if (nav && typeof nav.vibrate === "function") nav.vibrate(12);
	} catch {}
	attachHoldWindowListeners();
	updateWechatOverlayUI();
	const resolvedLang = resolveSpeechLang();
	let rapidEmptyEnds = 0;
	const resetHoldWatchdog = () => {
		if (voiceWatchdogTimer) clearTimeout(voiceWatchdogTimer);
		voiceWatchdogTimer = setTimeout(() => {
			if (holdActive) endHoldVoice(deps);
		}, 6e4);
	};
	const startHoldRecognitionChunk = (isAutoRestart) => {
		if (!voiceSessionActive || !holdActive) return;
		try {
			const recognition = new SpeechRecognitionCtor();
			recognition.lang = resolvedLang;
			recognition.interimResults = true;
			recognition.continuous = true;
			recognition.maxAlternatives = 3;
			try {
				recognition.unspokenPunctuation = true;
			} catch {}
			const chunkStartAt = Date.now();
			let chunkProducedText = false;
			let chunkFatalError = false;
			holdRawChunkText = "";
			holdPauseBreakpoints = [];
			activeVoiceRecognition = recognition;
			recognition.onresult = (event) => {
				if (!holdActive && !holdStopping || activeVoiceRecognition !== recognition) return;
				const utterance = mergeSpeechResults(event?.results);
				if (!utterance) return;
				const allFinal = areAllSpeechResultsFinal(event?.results);
				holdLastResultWasFinal = allFinal;
				holdLastResultAt = Date.now();
				chunkProducedText = true;
				rapidEmptyEnds = 0;
				resetHoldWatchdog();
				holdRawChunkText = utterance;
				const liveChunk = punctuateSpeechText(holdRawChunkText, holdPauseBreakpoints, {
					showTrailingPause: false,
					finalizeSentence: holdStopping
				});
				holdSpokenText = isAutoRestart ? joinDraftAndSpeech(holdCommittedText, liveChunk) : liveChunk;
				updateWechatOverlayUI();
				if (holdStopping) {
					if (holdSettleTimer) {
						clearTimeout(holdSettleTimer);
						holdSettleTimer = null;
					}
					if (allFinal) holdSettleTimer = setTimeout(() => {
						holdSettleTimer = null;
						finalizeHoldSession();
					}, 60);
					return;
				}
				if (voicePauseTimer) {
					clearTimeout(voicePauseTimer);
					voicePauseTimer = null;
				}
				if (holdActive && !holdStopping && utterance.length >= 2) {
					const snapText = utterance;
					voicePauseTimer = setTimeout(() => {
						voicePauseTimer = null;
						if (!holdActive || holdStopping || holdRawChunkText !== snapText) return;
						const len = snapText.length;
						if (!holdPauseBreakpoints.some((bp) => bp.len === len)) {
							holdPauseBreakpoints.push({
								len,
								head: snapText.slice(0, Math.max(2, len - 2))
							});
							const pausedChunk = punctuateSpeechText(holdRawChunkText, holdPauseBreakpoints, {
								showTrailingPause: true,
								finalizeSentence: false
							});
							holdSpokenText = isAutoRestart ? joinDraftAndSpeech(holdCommittedText, pausedChunk) : pausedChunk;
							updateWechatOverlayUI();
						}
					}, 650);
				}
			};
			recognition.onerror = (event) => {
				if (activeVoiceRecognition !== recognition) return;
				const errCode = event?.error || "";
				if (errCode === "no-speech") return;
				chunkFatalError = true;
				holdHadFatalError = true;
				stopVoiceInput();
				if (errCode === "service-not-allowed") {
					webSpeechServiceBlocked = true;
					setWechatVoiceMode(false, false, true);
					focusInputWithVisualPulse(input, "globalPromptInput", "🎙️ 桌面图标模式受苹果限制无法按住说话：请用 Safari 打开，或点键盘右下角「🎤」说话", showToast);
				} else if (errCode === "not-allowed") {
					if (!isAutoRestart) showToast("🎙️ 请在浏览器地址栏允许麦克风权限后再按住说话");
				} else if (errCode === "audio-capture") showToast("🎙️ 麦克风正被其他后台软件占用，请先关闭后再试");
				else if (errCode && errCode !== "aborted") showToast("⚠️ 语音识别异常：" + errCode);
			};
			recognition.onend = () => {
				if (activeVoiceRecognition !== recognition) return;
				if (holdStopping) {
					finalizeHoldSession();
					return;
				}
				activeVoiceRecognition = null;
				if (!voiceSessionActive || !holdActive || chunkFatalError) return;
				if (typeof document !== "undefined" && document.visibilityState === "hidden") {
					cancelHoldVoice();
					return;
				}
				holdCommittedText = holdSpokenText;
				const elapsed = Date.now() - chunkStartAt;
				if (!chunkProducedText && elapsed < 600) {
					rapidEmptyEnds += 1;
					if (rapidEmptyEnds >= 3) {
						finalizeHoldSession();
						return;
					}
				} else rapidEmptyEnds = 0;
				voiceRestartTimer = setTimeout(() => {
					voiceRestartTimer = null;
					if (voiceSessionActive && holdActive && !holdStopping) startHoldRecognitionChunk(true);
				}, chunkProducedText ? 25 : 150);
			};
			recognition.start();
		} catch {
			holdHadFatalError = true;
			stopVoiceInput();
			if (!isAutoRestart) {
				setWechatVoiceMode(false, false, true);
				focusInputWithVisualPulse(input, "globalPromptInput", "🎙️ 当前无法直接启动语音识别，已切回键盘，请用键盘「🎤」说话", showToast);
			}
		}
	};
	resetHoldWatchdog();
	startHoldRecognitionChunk(false);
	return true;
}
function moveHoldVoice(clientX, clientY) {
	if (!holdActive || holdStopping) return holdZone;
	const win = typeof window !== "undefined" ? window : null;
	const nav = typeof navigator !== "undefined" ? navigator : null;
	const nextZone = computeHoldZone(clientX, clientY, win?.innerWidth || 390, win?.innerHeight || 844, holdStartY);
	if (nextZone !== holdZone) {
		holdZone = nextZone;
		try {
			if (nav && typeof nav.vibrate === "function") nav.vibrate(10);
		} catch {}
		updateWechatOverlayUI();
	}
	return holdZone;
}
function cancelHoldVoice(deps) {
	if (!holdActive && !holdStopping) return;
	const win = typeof window !== "undefined" ? window : null;
	const showToast = deps?.showToast || activeHoldDeps?.showToast || (win && win.showToast ? win.showToast : () => {});
	const input = typeof document !== "undefined" && document ? document.getElementById("globalPromptInput") : null;
	const baseDraft = holdBaseDraft;
	activeHoldDeps = null;
	stopVoiceInput();
	if (input) input.value = baseDraft;
	showToast("已取消语音");
}
function endHoldVoice(deps) {
	if (!holdActive || holdStopping) return;
	if (deps) activeHoldDeps = deps;
	detachHoldWindowListeners();
	const win = typeof window !== "undefined" ? window : null;
	const showToast = activeHoldDeps?.showToast || (win && win.showToast ? win.showToast : () => {});
	const durationMs = Date.now() - holdStartAt;
	if (holdZone === "cancel") {
		cancelHoldVoice(activeHoldDeps);
		return;
	}
	if (durationMs < 260 && !String(holdSpokenText || "").trim()) {
		const baseDraft = holdBaseDraft;
		const input = typeof document !== "undefined" && document ? document.getElementById("globalPromptInput") : null;
		activeHoldDeps = null;
		stopVoiceInput();
		if (input) input.value = baseDraft;
		showToast("👆 请按住按钮说话，松开立即发送");
		return;
	}
	holdActive = false;
	holdStopping = true;
	voiceSessionActive = false;
	if (voiceRestartTimer) {
		clearTimeout(voiceRestartTimer);
		voiceRestartTimer = null;
	}
	updateWechatOverlayUI();
	if (activeVoiceRecognition) {
		try {
			activeVoiceRecognition.stop();
		} catch {
			finalizeHoldSession();
			return;
		}
		const maxFlushWaitMs = holdLastResultWasFinal && holdLastResultAt > 0 && Date.now() - holdLastResultAt >= 450 ? 450 : 1200;
		holdFinalizeTimer = setTimeout(() => {
			holdFinalizeTimer = null;
			finalizeHoldSession();
		}, maxFlushWaitMs);
	} else finalizeHoldSession();
}
function isDictationActiveFor(targetInputId = "") {
	return Boolean(voiceSessionActive && !holdActive && !holdStopping && activeVoiceRecognition && (!targetInputId || activeVoiceInputId === targetInputId));
}
function flushVoiceInputBeforeSend(targetInputId = "") {
	if (!isDictationActiveFor(targetInputId) || !activeDictationFlushHandler) {
		stopVoiceInput();
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		dictationFinalizeResolve = resolve;
		const handler = activeDictationFlushHandler;
		activeDictationFlushHandler = null;
		handler(() => {
			if (dictationFinalizeResolve === resolve) dictationFinalizeResolve = null;
			resolve();
		});
	});
}
function toggleVoiceInput(targetInputId = "globalPromptInput", btnId = "chatVoiceBtn", deps) {
	const win = window;
	const showToast = deps?.showToast || (win.showToast ?? (() => {}));
	const onComposerInput = deps?.onComposerInput || (win.onComposerInput ?? (() => {}));
	const btn = document.getElementById(btnId);
	if ((voiceSessionActive || activeVoiceRecognition) && activeVoiceInputId === targetInputId || btn?.classList.contains("recording")) {
		stopVoiceInput();
		showToast("⏹ 已关闭语音输入");
		return;
	}
	if (voiceSessionActive || activeVoiceRecognition || holdActive) stopVoiceInput();
	const input = document.getElementById(targetInputId);
	if (!input) return;
	const inputEl = input;
	if (inputEl.disabled || inputEl.readOnly) {
		const disabledMsg = "⏳ 当前会话正在执行或为观察模式，暂不可语音输入";
		showVoiceHintBar(targetInputId, disabledMsg, "fallback", 4500);
		showToast(disabledMsg);
		return;
	}
	const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
	if (!SpeechRecognitionCtor || webSpeechServiceBlocked) {
		focusInputWithVisualPulse(inputEl, targetInputId, webSpeechServiceBlocked ? "🎙️ 桌面图标模式受苹果限制无法直接识别：请用 Safari 打开，或点输入框用键盘右下角「🎤」说话" : "🎙️ 当前浏览器不支持直接语音识别，请点输入框用系统键盘「🎤」说话", showToast);
		return;
	}
	const resolvedLang = resolveSpeechLang();
	let committedBaseText = input.value || "";
	let rapidEmptyEnds = 0;
	const resetIdleWatchdog = () => {
		if (voiceWatchdogTimer) clearTimeout(voiceWatchdogTimer);
		voiceWatchdogTimer = setTimeout(() => {
			if (voiceSessionActive) {
				stopVoiceInput();
				showToast("ℹ️ 长时间未检测到新语音，已自动关闭麦克风");
			}
		}, 6e4);
	};
	const notifyInputChanged = () => {
		if (targetInputId === "globalPromptInput") onComposerInput();
		else try {
			if (typeof Event === "function" && typeof inputEl.dispatchEvent === "function") inputEl.dispatchEvent(new Event("input", { bubbles: true }));
		} catch {}
	};
	const startRecognitionChunk = (isAutoRestart) => {
		if (!voiceSessionActive) return;
		try {
			const recognition = new SpeechRecognitionCtor();
			recognition.lang = resolvedLang;
			recognition.interimResults = true;
			recognition.continuous = true;
			recognition.maxAlternatives = 3;
			try {
				recognition.unspokenPunctuation = true;
			} catch {}
			const chunkStartAt = Date.now();
			let chunkProducedText = false;
			let chunkFatalError = false;
			let chunkRawText = "";
			let lastDictationWrittenValue = input.value || "";
			let gotResultWhileStopping = false;
			const chunkPauseBreakpoints = [];
			activeVoiceRecognition = recognition;
			activeDictationFlushHandler = (done) => {
				if (!activeVoiceRecognition || activeVoiceRecognition !== recognition) {
					stopVoiceInput();
					done();
					return;
				}
				dictationStopping = true;
				voiceSessionActive = false;
				if (voicePauseTimer) {
					clearTimeout(voicePauseTimer);
					voicePauseTimer = null;
				}
				if (voiceRestartTimer) {
					clearTimeout(voiceRestartTimer);
					voiceRestartTimer = null;
				}
				if (voiceWatchdogTimer) {
					clearTimeout(voiceWatchdogTimer);
					voiceWatchdogTimer = null;
				}
				if (btnId) setVoiceBtnRecording(btnId, false);
				hideVoiceHintBar(targetInputId);
				let finished = false;
				const finishFlush = () => {
					if (finished) return;
					finished = true;
					dictationFinalizeFn = null;
					activeDictationFlushHandler = null;
					if (dictationSettleTimer) {
						clearTimeout(dictationSettleTimer);
						dictationSettleTimer = null;
					}
					if (dictationFinalizeTimer) {
						clearTimeout(dictationFinalizeTimer);
						dictationFinalizeTimer = null;
					}
					if (chunkRawText && (gotResultWhileStopping || input.value === lastDictationWrittenValue)) {
						const finalPunct = punctuateSpeechText(chunkRawText, chunkPauseBreakpoints, {
							showTrailingPause: false,
							finalizeSentence: true
						});
						input.value = isAutoRestart ? joinDraftAndSpeech(committedBaseText, finalPunct) : committedBaseText + finalPunct;
						lastDictationWrittenValue = input.value;
						notifyInputChanged();
					}
					stopVoiceInput();
					done();
				};
				dictationFinalizeFn = finishFlush;
				try {
					recognition.stop();
				} catch {
					finishFlush();
					return;
				}
				dictationFinalizeTimer = setTimeout(() => {
					dictationFinalizeTimer = null;
					finishFlush();
				}, 950);
			};
			recognition.onresult = (event) => {
				if (!voiceSessionActive && !dictationStopping || activeVoiceRecognition !== recognition) return;
				const utterance = mergeSpeechResults(event?.results);
				if (!utterance) return;
				const allFinal = areAllSpeechResultsFinal(event?.results);
				chunkProducedText = true;
				rapidEmptyEnds = 0;
				if (voiceSessionActive) resetIdleWatchdog();
				chunkRawText = utterance;
				const punctuated = punctuateSpeechText(chunkRawText, chunkPauseBreakpoints, {
					showTrailingPause: false,
					finalizeSentence: dictationStopping
				});
				input.value = isAutoRestart ? joinDraftAndSpeech(committedBaseText, punctuated) : committedBaseText + punctuated;
				lastDictationWrittenValue = input.value;
				notifyInputChanged();
				if (dictationStopping) {
					gotResultWhileStopping = true;
					if (dictationSettleTimer) {
						clearTimeout(dictationSettleTimer);
						dictationSettleTimer = null;
					}
					if (allFinal) dictationSettleTimer = setTimeout(() => {
						dictationSettleTimer = null;
						if (dictationFinalizeFn) dictationFinalizeFn();
					}, 60);
					return;
				}
				if (voicePauseTimer) {
					clearTimeout(voicePauseTimer);
					voicePauseTimer = null;
				}
				if (voiceSessionActive && utterance.length >= 2) {
					const snapText = utterance;
					voicePauseTimer = setTimeout(() => {
						voicePauseTimer = null;
						if (!voiceSessionActive || activeVoiceRecognition !== recognition || chunkRawText !== snapText) return;
						const len = snapText.length;
						if (!chunkPauseBreakpoints.some((bp) => bp.len === len)) {
							chunkPauseBreakpoints.push({
								len,
								head: snapText.slice(0, Math.max(2, len - 2))
							});
							const pausedPunct = punctuateSpeechText(chunkRawText, chunkPauseBreakpoints, {
								showTrailingPause: true,
								finalizeSentence: false
							});
							input.value = isAutoRestart ? joinDraftAndSpeech(committedBaseText, pausedPunct) : committedBaseText + pausedPunct;
							lastDictationWrittenValue = input.value;
							notifyInputChanged();
						}
					}, 650);
				}
			};
			recognition.onerror = (event) => {
				if (activeVoiceRecognition !== recognition) return;
				const errCode = event?.error || "";
				if (errCode === "no-speech") return;
				chunkFatalError = true;
				stopVoiceInput();
				if (errCode === "service-not-allowed") {
					webSpeechServiceBlocked = true;
					focusInputWithVisualPulse(inputEl, targetInputId, "🎙️ 桌面图标模式受苹果限制无法直接识别：请用 Safari 打开，或点输入框用键盘右下角「🎤」说话", showToast);
				} else if (errCode === "not-allowed") {
					if (!isAutoRestart) {
						showVoiceHintBar(targetInputId, "🎙️ 未开启麦克风权限：请在浏览器地址栏允许麦克风后重试", "fallback", 5500);
						showToast("🎙️ 未开启麦克风权限：请在地址栏允许麦克风");
					}
				} else if (errCode === "audio-capture") {
					showVoiceHintBar(targetInputId, "🎙️ 麦克风正被其他后台语音软件占用，请先关闭后台语音后再点「🎤」", "fallback", 5500);
					showToast("🎙️ 麦克风被后台软件占用，请关闭后再试");
				} else if (errCode && errCode !== "aborted") {
					showVoiceHintBar(targetInputId, "⚠️ 语音识别异常（" + errCode + "），可再点「🎤」重试", "fallback", 5e3);
					showToast("⚠️ 语音识别已停止：" + errCode);
				}
			};
			recognition.onend = () => {
				if (activeVoiceRecognition !== recognition) return;
				if (dictationStopping) {
					if (dictationFinalizeFn) dictationFinalizeFn();
					return;
				}
				activeVoiceRecognition = null;
				notifyInputChanged();
				if (!voiceSessionActive || chunkFatalError) return;
				if (typeof document !== "undefined" && document.visibilityState === "hidden") {
					stopVoiceInput();
					return;
				}
				committedBaseText = input.value || "";
				const elapsed = Date.now() - chunkStartAt;
				if (!chunkProducedText && elapsed < 600) {
					rapidEmptyEnds += 1;
					if (rapidEmptyEnds >= 3) {
						stopVoiceInput();
						return;
					}
				} else rapidEmptyEnds = 0;
				voiceRestartTimer = setTimeout(() => {
					voiceRestartTimer = null;
					if (voiceSessionActive) startRecognitionChunk(true);
				}, chunkProducedText ? 25 : 180);
			};
			recognition.start();
		} catch {
			if (isAutoRestart) stopVoiceInput();
			else {
				stopVoiceInput();
				focusInputWithVisualPulse(inputEl, targetInputId, "🎙️ 当前无法直接启动语音识别，请点输入框用系统键盘「🎤」说话", showToast);
			}
		}
	};
	voiceSessionActive = true;
	activeVoiceInputId = targetInputId;
	activeVoiceBtnId = btnId;
	setVoiceBtnRecording(btnId, true);
	showVoiceHintBar(targetInputId, "🔴 正在持续听写… 停顿不会断，说完点「⏹」或直接「发送」", "recording", 0);
	if (!document.getElementById(resolveHintBarId(targetInputId))) showToast("🎙️ 正在持续听写，说完点「⏹」或直接发送");
	resetIdleWatchdog();
	startRecognitionChunk(false);
}
// hub/web/src/utils/qrcode.js
var VERSION_SPECS = [
	null,
	{
		size: 21,
		totalCodewords: 26,
		ecCodewords: 7,
		dataBytes: 17,
		align: []
	},
	{
		size: 25,
		totalCodewords: 44,
		ecCodewords: 10,
		dataBytes: 32,
		align: [6, 18]
	},
	{
		size: 29,
		totalCodewords: 70,
		ecCodewords: 15,
		dataBytes: 53,
		align: [6, 22]
	},
	{
		size: 33,
		totalCodewords: 100,
		ecCodewords: 20,
		dataBytes: 78,
		align: [6, 26]
	},
	{
		size: 37,
		totalCodewords: 134,
		ecCodewords: 26,
		dataBytes: 106,
		align: [6, 30]
	},
	{
		size: 41,
		totalCodewords: 172,
		ecCodewords: 36,
		dataBytes: 134,
		align: [6, 34]
	}
];
var GF_EXP = /* @__PURE__ */ new Uint8Array(512);
var GF_LOG = /* @__PURE__ */ new Uint8Array(256);
(() => {
	let x = 1;
	for (let i = 0; i < 255; i += 1) {
		GF_EXP[i] = x;
		GF_LOG[x] = i;
		x <<= 1;
		if (x & 256) x ^= 285;
	}
	for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();
function gfMul(a, b) {
	if (a === 0 || b === 0) return 0;
	return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}
function rsGeneratorPoly(degree) {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i += 1) {
		const next = new Uint8Array(poly.length + 1);
		const factor = GF_EXP[i];
		for (let j = 0; j < poly.length; j += 1) {
			next[j] ^= poly[j];
			next[j + 1] ^= gfMul(poly[j], factor);
		}
		poly = next;
	}
	return poly;
}
function rsEncode(data, ecLen) {
	const gen = rsGeneratorPoly(ecLen);
	const rem = new Uint8Array(ecLen);
	for (let i = 0; i < data.length; i += 1) {
		const factor = data[i] ^ rem[0];
		for (let j = 0; j < ecLen - 1; j += 1) rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
		rem[ecLen - 1] = gfMul(gen[ecLen], factor);
	}
	return rem;
}
function encodeDataCodewords(utf8Bytes, spec) {
	spec.dataBytes;
	const bits = [];
	const pushBits = (val, len) => {
		for (let i = len - 1; i >= 0; i -= 1) bits.push(val >>> i & 1);
	};
	pushBits(4, 4);
	pushBits(utf8Bytes.length, 8);
	for (const b of utf8Bytes) pushBits(b, 8);
	const maxBits = (spec.totalCodewords - spec.ecCodewords) * 8;
	for (let i = 0; i < 4 && bits.length < maxBits; i += 1) bits.push(0);
	while (bits.length % 8 !== 0) bits.push(0);
	const codewords = new Uint8Array(maxBits / 8);
	for (let i = 0; i < bits.length / 8; i += 1) {
		let byte = 0;
		for (let b = 0; b < 8; b += 1) byte = byte << 1 | bits[i * 8 + b];
		codewords[i] = byte;
	}
	const pads = [236, 17];
	for (let i = bits.length / 8, p = 0; i < codewords.length; i += 1, p ^= 1) codewords[i] = pads[p];
	if (spec.totalCodewords === 172) {
		const b1 = codewords.slice(0, 68);
		const b2 = codewords.slice(68, 136);
		const ec1 = rsEncode(b1, 18);
		const ec2 = rsEncode(b2, 18);
		const out = /* @__PURE__ */ new Uint8Array(172);
		let idx = 0;
		for (let i = 0; i < 68; i += 1) {
			out[idx++] = b1[i];
			out[idx++] = b2[i];
		}
		for (let i = 0; i < 18; i += 1) {
			out[idx++] = ec1[i];
			out[idx++] = ec2[i];
		}
		return out;
	}
	const ec = rsEncode(codewords, spec.ecCodewords);
	const out = new Uint8Array(spec.totalCodewords);
	out.set(codewords, 0);
	out.set(ec, codewords.length);
	return out;
}
function renderQrCodeSvg(text, { sizePx = 188, margin = 3 } = {}) {
	const utf8 = new TextEncoder().encode(String(text || ""));
	let version = 1;
	while (version <= 6 && VERSION_SPECS[version].dataBytes < utf8.length) version += 1;
	if (version > 6) return `<div style="padding:16px;font-size:12px;color:var(--muted);">链接较长，请直接使用下方 6 位配对码</div>`;
	const spec = VERSION_SPECS[version];
	const n = spec.size;
	const grid = Array.from({ length: n }, () => new Int8Array(n));
	const reserved = Array.from({ length: n }, () => new Uint8Array(n));
	const setModule = (r, c, dark, isReserved = true) => {
		if (r < 0 || r >= n || c < 0 || c >= n) return;
		grid[r][c] = dark ? 1 : 0;
		if (isReserved) reserved[r][c] = 1;
	};
	const placeFinder = (row, col) => {
		for (let dr = -1; dr <= 7; dr += 1) for (let dc = -1; dc <= 7; dc += 1) {
			const r = row + dr;
			const c = col + dc;
			if (r < 0 || r >= n || c < 0 || c >= n) continue;
			setModule(r, c, dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4), true);
		}
	};
	placeFinder(0, 0);
	placeFinder(0, n - 7);
	placeFinder(n - 7, 0);
	for (let i = 8; i < n - 8; i += 1) {
		setModule(6, i, i % 2 === 0, true);
		setModule(i, 6, i % 2 === 0, true);
	}
	for (const ar of spec.align) for (const ac of spec.align) {
		if (ar === 6 && ac === 6 || ar === 6 && ac === n - 7 || ar === n - 7 && ac === 6) continue;
		for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) {
			const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
			setModule(ar + dr, ac + dc, dark, true);
		}
	}
	for (let i = 0; i < 9; i += 1) if (i !== 6) {
		reserved[8][i] = 1;
		reserved[i][8] = 1;
	}
	for (let i = 0; i < 8; i += 1) {
		reserved[8][n - 1 - i] = 1;
		reserved[n - 1 - i][8] = 1;
	}
	setModule(n - 8, 8, true, true);
	const codewords = encodeDataCodewords(utf8, spec);
	let bitIdx = 0;
	const totalBits = codewords.length * 8;
	let upward = true;
	for (let col = n - 1; col > 0; col -= 2) {
		if (col === 6) col -= 1;
		for (let step = 0; step < n; step += 1) {
			const r = upward ? n - 1 - step : step;
			for (let dc = 0; dc < 2; dc += 1) {
				const c = col - dc;
				if (reserved[r][c]) continue;
				let bit = 0;
				if (bitIdx < totalBits) {
					bit = codewords[bitIdx >>> 3] >>> 7 - (bitIdx & 7) & 1;
					bitIdx += 1;
				}
				if ((r + c) % 2 === 0) bit ^= 1;
				grid[r][c] = bit;
			}
		}
		upward = !upward;
	}
	const formatBits = 30660;
	const fCoords1 = [
		[8, 0],
		[8, 1],
		[8, 2],
		[8, 3],
		[8, 4],
		[8, 5],
		[8, 7],
		[8, 8],
		[7, 8],
		[5, 8],
		[4, 8],
		[3, 8],
		[2, 8],
		[1, 8],
		[0, 8]
	];
	for (let i = 0; i < 15; i += 1) {
		const bit = formatBits >>> i & 1;
		const [r1, c1] = fCoords1[i];
		grid[r1][c1] = bit;
		if (i < 8) grid[8][n - 1 - i] = bit;
		else grid[n - 15 + i][8] = bit;
	}
	const totalDim = n + margin * 2;
	let path = "";
	for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (grid[r][c]) path += `M${c + margin},${r + margin}h1v1h-1z`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDim} ${totalDim}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="border-radius:14px;background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 4px 14px rgba(15,23,42,0.06);"><rect width="100%" height="100%" fill="#ffffff"/><path d="${path}" fill="#0f172a"/></svg>`;
}
// hub/web/src/utils/i18n.js
var EXACT_ZH_TO_EN = {
	"🔒 DSH 远控总控台": "🔒 DSH Remote Control Hub",
	"DSH 远控控制台登录": "DSH Remote Control Hub",
	"💻 电脑首次接入": "💻 First-Time Computer Setup",
	"电脑首次接入": "First-Time Computer Setup",
	"：输入部署时设置的管理密码 (": ": Enter the admin password (",
	"📱 手机免密登录": "📱 Phone Passwordless Login",
	"手机免密登录": "Phone Passwordless Login",
	"：直接扫电脑网页上的二维码，或输入 6 位配对码": ": Scan the QR code on your computer screen, or enter the 6-digit code",
	"输入管理密码 (HUB_TOKEN) 或 6 位配对码...": "Enter HUB_TOKEN password or 6-digit pairing code...",
	"🔓 解锁进入总控台": "🔓 Unlock Control Hub",
	"视图体验：": "View Mode:",
	"📱 iPhone 手机视图": "📱 iPhone Mobile View",
	"🖥️ 电脑双栏同屏视图": "🖥️ Desktop Split View",
	"📲 想收锁屏通知？点底部分享": "📲 Want lock-screen alerts? Tap Share",
	"→ 添加到主屏幕": "→ Add to Home Screen",
	"，再从桌面图标打开": ", then open from Home Screen",
	"知道了": "Got it",
	"操作成功": "Done",
	"⬇️ 最新消息": "⬇️ Latest",
	"连接中...": "Connecting...",
	"⚡ 极速": "⚡ Turbo",
	"新建对话": "New Task",
	"⚠️ 网络连接中断，正在自动重连…": "⚠️ Connection lost, reconnecting…",
	"点此立即重试": "Tap to retry",
	"搜索对话标题、项目或内容...": "Search sessions, projects, or messages...",
	"对话": "Sessions",
	"项目文件": "Files",
	"设备与设置": "Settings",
	"‹ 返回": "‹ Back",
	"选择一个会话": "Select a Session",
	"点击左侧任意对话开始遥控": "Select any session on the left to start remote control",
	"💬 对话流": "💬 Chat",
	"📂 项目代码": "📂 Code",
	"📂 文件速览": "📂 Files",
	"👈 点击任意会话查看详细对话与思考过程": "👈 Select any session to view full transcript & thinking steps",
	"🟢 AI 正在电脑上执行任务...": "🟢 AI is executing on your computer...",
	"⏹ 立即停止": "⏹ Stop Now",
	"从手机相册上传截图或照片": "Upload screenshot or photo from phone",
	"语音输入（点击说话，再点停止）": "Voice input (tap to speak, tap again to stop)",
	"语音输入": "Voice input",
	"发指令或点左侧🖼️传截图...": "Type a message or tap 🖼️ to attach screenshots...",
	"切换遥控的电脑": "Switch Connected Computer",
	"✨ 新建远程对话任务": "✨ New Remote AI Task",
	"2. 选择执行引擎 (Harness / IDE)": "2. Select AI Engine (Harness / IDE)",
	"3. 选择项目文件夹（免手敲路径）": "3. Select Project Folder",
	"4. 任务指令（支持截图或语音）": "4. Task Prompt (Screenshots or Voice)",
	"🖼️ 传截图": "🖼️ Screenshot",
	"🔍 检查运行状态": "🔍 Check Status",
	"🧪 跑测试修 Bug": "🧪 Run Tests & Fix Bugs",
	"📦 总结代码改动": "📦 Summarize Git Diff",
	"输入你想让电脑执行的任务，或点击右上角🖼️传截图...": "Describe the task for your computer, or tap 🖼️ to attach screenshots...",
	"🚀 立即在电脑上启动任务": "🚀 Launch Task on Computer",
	"会话操作": "Session Actions",
	"📂 当前项目文件速览": "📂 Project Files",
	"📦 跨电脑一键迁移向导": "📦 Cross-Computer Migration Wizard",
	"⚡ 极速实时同步 (Rust + SSE) 指南": "⚡ Turbo Real-Time Sync (Rust + SSE) Guide",
	"🔗 端到端加密分享已生成": "🔗 E2EE Share Link Ready",
	"📱 添加新手机（6 位配对码）": "📱 Phone QR / 6-Digit Pairing Login",
	"当前浏览器限制自动写入剪贴板，请点下方按钮或长按文本框全选复制：": "Browser blocked auto-copy. Tap the button below or long-press the text box to copy:",
	"📋 点击复制": "📋 Copy to Clipboard",
	"请输入部署时设置的 HUB_TOKEN 密码，或在新手机输入 6 位一次性配对码": "Enter your HUB_TOKEN password, or a 6-digit one-time pairing code",
	"输入访问密码或 6 位配对码...": "Enter password or 6-digit pairing code...",
	"解锁进入控制台": "Unlock Console",
	"💡 提示：已登录的手机可在「设置 → 添加新手机」生成 3 分钟有效的 6 位配对码。": "💡 Tip: On a logged-in device, open Settings → Phone QR Login to generate a 3-min pairing code.",
	"⚠️ 网络连接中断，正在自动重连… 点此立即重试": "⚠️ Connection lost, reconnecting… Tap to retry now",
	"⚠️ 当前手机网络已断开，恢复网络后将自动重连": "⚠️ Offline. Will reconnect automatically when network is back",
	"🔄 正在重新连接总控台…": "🔄 Reconnecting to Control Hub…",
	"预览模式:": "View Mode:",
	"📱 手机单列视图 (iPhone 16 Pro)": "📱 Phone View (iPhone 16 Pro)",
	"🖥️ 电脑自适应双栏视图": "🖥️ Desktop Split View",
	"无模拟器外框 · 在真实手机打开即全屏": "Frameless · Fullscreen on mobile",
	"📲 把「DSH 远控」添加到主屏幕，才能开启 iPhone 锁屏通知：点 Safari 底部": "📲 Add \"DSH Remote\" to Home Screen for iPhone lock-screen push: tap Safari",
	"分享": "Share",
	"添加到主屏幕": "Add to Home Screen",
	"我知道了": "Got it",
	"切换或查看已连接电脑": "Switch or view connected computers",
	"未接入电脑 (0)": "No Computer Connected (0)",
	"🦀 极速实时": "🦀 Rust Turbo",
	"⚡ 极速实时": "⚡ Turbo Live",
	"⚠️ 需开权限": "⚠️ Needs Permission",
	"🚀 点此提速": "🚀 Boost Speed",
	"查看或开启极速实时同步模式": "View or enable Turbo real-time sync",
	"新建远程 AI 任务": "New remote AI task",
	"＋ 新建": "＋ New",
	"搜索会话、项目或回复内容...": "Search sessions, projects, or replies...",
	"清除搜索": "Clear search",
	"会话": "Sessions",
	"文件": "Files",
	"设置": "Settings",
	"返回列表": "Back",
	"切换电脑": "Switch Host",
	"正在加载对话...": "Loading conversation...",
	"💬 对话": "💬 Chat",
	"📂 代码": "📂 Code",
	"查看当前项目文件": "Browse project files",
	"📂 文件": "📂 Files",
	"更多操作": "More actions",
	"⬇ 最新消息": "⬇ Latest",
	"🟢 AI 正在思考与执行任务...": "🟢 AI is thinking & executing tools...",
	"⚡ 支持底部直接输入「实时插话」或": "⚡ Type below to steer live, or",
	"⏹ 紧急停止": "⏹ Stop Now",
	"上传截图或照片": "Upload screenshot or photo",
	"语音输入（点击开始说话）": "Voice input (tap to speak)",
	"发指令继续对话...": "Send a message to continue...",
	"发送": "Send",
	"⚡ 插话": "⚡ Steer",
	"🟢 执行中": "🟢 Running",
	"👀 仅观察": "👀 Observe",
	"👀 当前会话为观察模式（仅支持查看对话记录）": "👀 Observe-only mode (view transcript only)",
	"⏳ 当前后端正在执行中（不支持实时插话，可点击上方停止）": "⏳ Task running (live steering not supported on this backend; tap Stop above)",
	"⚡ 实时插话 (Steer)：补充指令将立即注入...": "⚡ Live Steer: your instruction will be injected immediately...",
	"📋 复制最新回复全文": "📋 Copy Latest Reply",
	"▶ 继续执行下一步": "▶ Continue next step",
	"🔍 查看 git status 与改动": "🔍 Check git status & diff",
	"🧪 运行测试验证": "🧪 Run tests & verify",
	"📋 一键复制全文": "📋 Copy Full Reply",
	"📋 复制全文": "📋 Copy Reply",
	"✅ 已复制全文": "✅ Copied",
	"🔊 播报": "🔊 Listen",
	"⏹ 停止": "⏹ Stop",
	"⚡ 重点": "⚡ Summary",
	"📖 全文": "📖 Full",
	"切换重点摘要 / 完整去噪": "Toggle Summary / Full Denoised",
	"切换播报倍速": "Cycle playback speed",
	"⚠️ 当前浏览器暂不支持系统语音播报": "⚠️ System speech playback is not supported in this browser",
	"⚠️ 暂无可播报的回复内容": "⚠️ No reply content to read aloud",
	"⚙️ 正在思考与执行工具调用...": "⚙️ Thinking and running tools...",
	"点击查看详情 ▾": "View details ▾",
	"执行完毕": "Done",
	"查看改动": "View Diff",
	"跳过 / 取消": "Skip / Cancel",
	"提交选择 ↵": "Submit Choice ↵",
	"⏳ 正在提交...": "⏳ Submitting...",
	"⏳ 正在同步...": "⏳ Syncing...",
	"⏳ 处理中...": "⏳ Processing...",
	"✅ 允许执行": "✅ Approve",
	"✕ 拒绝": "✕ Deny",
	"可多选": "Multi-select",
	"请选择一项": "Please select an option",
	"请做出选择以继续": "Please make a selection to continue",
	"📄 查看完整方案内容 (点击展开)": "📄 View full plan details (tap to expand)",
	"或者直接输入自定义回答 / 补充说明...": "Or type a custom answer / note...",
	"⏳ 排队中（电脑上线后执行）": "⏳ Queued (runs when computer is online)",
	"✕ 取消": "✕ Cancel",
	"⚠️ 电脑超过 10 分钟未上线，该指令已超时未执行": "⚠️ Computer offline for >10m; command expired",
	"📱 手机扫码登录": "📱 Phone QR Login",
	"📱 扫码": "📱 QR",
	"＋ 新建远程对话": "＋ New Remote Task",
	"电脑已接入，还没有对话记录": "Computer connected! No sessions yet",
	"你可以直接在远程电脑上启动第一个任务，或点击「手机扫码登录」在手机上打开": "Start a task on your computer or tap \"Phone QR Login\" to open on your phone",
	"🔍 暂无匹配的对话记录": "🔍 No matching sessions found",
	"↺ 清除筛选条件": "↺ Clear filters",
	"去选择 ›": "Select ›",
	"跳过": "Skip",
	"✓ 允许": "✓ Allow",
	"拒绝": "Deny",
	"立即切换 ›": "Switch ›",
	"⏳ 同步电脑中...": "⏳ Syncing...",
	"⚠️ 选择待重试": "⚠️ Retry Choice",
	"⚠️ 审批待重试": "⚠️ Retry Approval",
	"⏳ 待你选择": "⏳ Needs Input",
	"⏳ 待你授权": "⏳ Needs Approval",
	"● 运行中": "● Running",
	"🔵 已出结论": "🔵 Completed",
	"⚠️ 中断待继续": "⚠️ Interrupted",
	"已置顶": "Pinned",
	"正在思考与执行任务...": "Thinking and running task...",
	"等待你批准工具执行": "Waiting for tool approval",
	"等待你做出选择": "Waiting for your selection",
	"点击查看对话详情": "Tap to view conversation",
	"未命名会话": "Untitled Session",
	"默认工作区": "Default Workspace",
	"📁 默认工作区": "📁 Default Workspace",
	"➕ 添加电脑": "➕ Add Computer",
	"📋 复制命令": "📋 Copy Cmd",
	"💻 本机未接入 · 3 步开启手机远控": "💻 Connect Your Computer in 3 Steps",
	"➕ 添加电脑（凭配对码加入，无需主密码）": "➕ Add Computer (Join via enrollment code)",
	"每台电脑独立凭证可单机吊销；有效期内可连加多台电脑": "Each computer gets an isolated revocable token; connect multiple hosts with one code",
	"🔄 换码": "🔄 New Code",
	"▴ 收起": "▴ Collapse",
	"▾ 详情": "▾ Details",
	"当前电脑配对码": "Enrollment Code",
	"剩余有效期": "Valid For",
	"本码已加入": "Joined Hosts",
	"在电脑终端执行这一行命令（自动安装、自动连上、开机自启）：": "Run this 1-line command in your computer terminal (auto-installs & starts on login):",
	"📋 复制一行安装命令": "📋 Copy 1-Line Install Command",
	"📋 已克隆仓库用此条": "📋 Copy Local Repo Command",
	"添加电脑与手机扫码登录": "Add Computer & Phone QR Login",
	"暂未检测到在线电脑，请复制上方「添加电脑」命令在终端执行": "No computer connected yet. Copy the 1-line command above and run it in your terminal.",
	"🎯 主控": "🎯 Primary",
	"🚫 已吊销": "🚫 Revoked",
	"供电与电量": "Power & Battery",
	"网络与延迟": "Network & Latency",
	"会话与存储": "Sessions & Storage",
	"同步与系统": "Sync & OS",
	"电源直供": "AC Power",
	"供电正常": "Power OK",
	"🟣 DSH · ✅ 远控+审批": "🟣 DSH · ✅ Control + Approve",
	"⚡ Antigravity · ✅ 远控+审批": "⚡ Antigravity · ✅ Control + Approve",
	"🎯 飞书当前主控": "🎯 Active Primary",
	"切飞书到这台": "Set as Primary",
	"🔔 飞书通知: 开": "🔔 Host Alerts: ON",
	"🔕 飞书通知: 关": "🔕 Host Alerts: OFF",
	"⚡ 极速详情": "⚡ Turbo Status",
	"🚀 一键提速": "🚀 Enable Turbo",
	"🔄 一键升级": "🔄 1-Click Upgrade",
	"⏳ 正在升级重启...": "⏳ Upgrading & Restarting...",
	"🔄 检查/重装更新": "🔄 Check / Reinstall Update",
	"恢复接入": "Restore Access",
	"🚫 吊销凭证": "🚫 Revoke Token",
	"各后端功能边界（诚实矩阵）": "Supported AI Tools & Capability Matrix",
	"豆包电脑版": "Doubao Desktop",
	"豆包": "Doubao",
	"豆包对话": "Doubao Chat",
	"豆包工作": "Doubao Agent",
	"👀 仅观测": "👀 Observe-only",
	"任务看板": "Task Board",
	"豆包产物": "Doubao Artifact",
	"后端": "Backend",
	"看会话": "View",
	"发指令": "Prompt",
	"停止": "Stop",
	"手机审批": "Approve",
	"实时插话": "Steer",
	"计划中": "Planned",
	"外观与显示模式": "Appearance & Language",
	"界面语言 / Language": "Language / 界面语言",
	"自动识别浏览器语言或手动切换": "Auto-detected from browser or switch manually",
	"深色 / 浅色主题": "Theme Mode",
	"自动或手动切换外观": "Switch between System, Light, and Dark mode",
	"跟随系统": "System",
	"☀️ 浅色": "☀️ Light",
	"🌙 深色": "🌙 Dark",
	"多电脑协同与一键迁移": "Multi-Host Session Migration",
	"跨电脑一键迁移会话": "1-Click Cross-Host Session Migration",
	"将源电脑 ~/.dsh 会话打包同步至目标电脑并可选清理源机": "Package and sync ~/.dsh sessions from source computer to target computer",
	"📦 打开迁移向导": "📦 Migration Wizard",
	"🌐 打开": "🌐 Open",
	"📋 复制完整解密链接": "📋 Copy Decrypt Link",
	"🗑️ 销毁": "🗑️ Delete",
	"暂无加密分享记录。可在任意会话右上角「⋯ → 生成 AES-256 端到端加密回放链接」创建。": "No encrypted shares yet. Tap \"⋯ → Generate AES-256 Encrypted Share Link\" in any session.",
	"手机锁屏通知 (iOS 16.4+ Web Push)": "Lock-Screen Notifications (iOS 16.4+ Web Push)",
	"启用 iPhone 锁屏实时推送": "Enable iPhone Lock-Screen Push",
	"当任意电脑有待审批、任务完成或异常时直接弹窗": "Get instant lock-screen alerts when any computer needs approval or finishes a task",
	"正在检测本机推送状态…": "Checking push subscription status…",
	"📲 开启推送": "📲 Enable Push",
	"🔔 测试": "🔔 Test Push",
	"关闭本机推送": "Disable Push",
	"iPhone 需先在 Safari「分享 → 添加到主屏幕」，再从桌面图标打开本页开启，才能收到锁屏通知": "On iPhone, tap Safari \"Share → Add to Home Screen\" first, then open from Home Screen to enable push.",
	"隐私与访问密码保护": "Security & Access Control",
	"添加新手机（6 位免密配对码）": "Pair New Phone (QR / 6-Digit Code)",
	"生成 3 分钟有效的一次性 6 位字母/数字配对码，新手机免输长密码直接解锁": "Generate a 3-minute QR & 6-digit code to sign in on your phone without typing a password",
	"📱 生成配对码": "📱 Show QR / Code",
	"修改总控台访问密码": "Change Control Hub Password",
	"随时更换访问密钥，防止未授权访问": "Rotate your HUB_TOKEN password at any time",
	"🔑 修改密码": "🔑 Change Password",
	"锁定当前浏览器": "Lock Current Browser",
	"清除本机浏览器缓存的登录凭证": "Clear saved credentials on this browser",
	"🔒 立即锁定": "🔒 Lock Now",
	"还没有设备登记推送": "No devices registered for push yet",
	"本机：✅ 已开启锁屏推送": "This device: ✅ Lock-screen push enabled",
	"本机：未开启（点下方「开启推送」）": "This device: Not enabled (tap \"Enable Push\" below)",
	"本机：当前浏览器不支持锁屏推送（iPhone 需从主屏幕 App 打开）": "This device: Web Push unsupported in this tab (open from Home Screen on iPhone)",
	"切换连接的电脑": "Switch Connected Computer",
	"🌐 全部电脑汇总": "🌐 All Computers Combined",
	"当前视图 ✓": "Active ✓",
	"当前设备 ✓": "Active ✓",
	"切换 ›": "Switch ›",
	"✨ 新建远程 AI 任务": "✨ New Remote AI Task",
	"1. 选择执行电脑": "1. Select Target Computer",
	"1.5 选择 AI 编程工具": "1.5 Select AI Coding Tool",
	"2. 选择工作区目录": "2. Select Workspace Directory",
	"3. 任务指令": "3. Task Prompt",
	"📎 上传截图": "📎 Add Screenshot",
	"🎤 语音输入": "🎤 Voice Input",
	"🎤 语音": "🎤 Voice",
	"🎙️ 语音": "🎙️ Voice",
	"⌨️ 打字": "⌨️ Type",
	"切换为微信式按住说话": "Switch to Hold-to-Talk voice mode",
	"切换为键盘打字输入": "Switch to keyboard typing mode",
	"🎙️ 按住 说话": "🎙️ Hold to Talk",
	"🎙️ 按住 说话（实时插话）": "🎙️ Hold to Talk (Live Steer)",
	"🟢 松开 立即发送": "🟢 Release to Send",
	"🔴 松开 取消发送": "🔴 Release to Cancel",
	"🔵 松开 填入输入框改字": "🔵 Release to Edit Text",
	"⏳ AI 执行中（暂不可说话）": "⏳ AI Running (Voice Locked)",
	"👀 当前为观察模式（仅查看）": "👀 Observe-Only Mode",
	"正在听你说话…": "Listening…",
	"左滑取消": "Slide Left: Cancel",
	"右滑改字": "Slide Right: Edit",
	"松开 立即发送": "Release to Send",
	"松开手指，取消发送": "Release to Cancel",
	"松开手指，填入输入框修改": "Release to Edit Text",
	"正在发送…": "Sending…",
	"正在转文字…": "Converting to text…",
	"已取消语音": "Voice cancelled",
	"👆 请按住按钮说话，松开立即发送": "👆 Hold button to speak, release to send",
	"🎙️ 未听到说话内容，请按住重试": "🎙️ No speech heard, hold and try again",
	"✍️ 已转为文字，修改后点「发送」即可": "✍️ Converted to text — edit and tap Send",
	"⏳ 当前会话正在执行或为观察模式，暂不可说话": "⏳ Session is running or observe-only; voice unavailable right now",
	"🎙️ 请在浏览器地址栏允许麦克风权限后再按住说话": "🎙️ Allow microphone permission in the address bar, then hold to talk",
	"🎙️ 麦克风正被其他后台软件占用，请先关闭后再试": "🎙️ Microphone is busy in another app; close it and retry",
	"⏹ 停止": "⏹ Stop",
	"⏹ 停止听写": "⏹ Stop Dictation",
	"⏹ 已关闭语音输入": "⏹ Voice input stopped",
	"🎙️ 正在听写，请直接说话（再点「⏹」立即关闭）": "🎙️ Listening… Speak now (tap ⏹ to stop)",
	"🔴 正在听写… 请直接说话（再点下方「⏹」结束）": "🔴 Listening… Speak now (tap ⏹ below to stop)",
	"🔴 正在持续听写… 停顿不会断，说完点「⏹」或直接「发送」": "🔴 Continuous dictation… Pauses will not stop; tap ⏹ or Send when done",
	"🎙️ 正在持续听写，说完点「⏹」或直接发送": "🎙️ Continuous dictation active; tap ⏹ or Send when done",
	"ℹ️ 长时间未检测到新语音，已自动关闭麦克风": "ℹ️ Mic auto-closed after 60s of silence",
	"⏳ 当前会话正在执行或为观察模式，暂不可语音输入": "⏳ Session is running or observe-only; voice input unavailable right now",
	"🎙️ 桌面图标模式受苹果限制无法直接识别：请用 Safari 打开，或点输入框用键盘右下角「🎤」说话": "🎙️ Home Screen mode blocks direct speech API on iOS: open in Safari, or tap 🎤 on your keyboard",
	"🎙️ 当前浏览器不支持直接语音识别，请点输入框用系统键盘「🎤」说话": "🎙️ Browser speech input unavailable; please tap 🎤 on your system keyboard",
	"🎙️ 未开启麦克风权限：请在浏览器地址栏允许麦克风后重试": "🎙️ Mic permission denied: allow microphone in the address bar and retry",
	"🎙️ 未开启麦克风权限：请在地址栏允许麦克风": "🎙️ Mic permission denied: allow microphone in the address bar",
	"🎙️ 麦克风正被其他后台语音软件占用，请先关闭后台语音后再点「🎤」": "🎙️ Microphone is in use by another background app; close it and tap 🎤 again",
	"🎙️ 麦克风被后台软件占用，请关闭后再试": "🎙️ Microphone is busy in another app; close it and retry",
	"🎙️ 当前无法直接启动语音识别，请点输入框用系统键盘「🎤」说话": "🎙️ Unable to start speech recognition directly; please use system keyboard 🎤",
	"ℹ️ 未检测到说话声，可再点「🎤」重试": "ℹ️ No speech detected; tap 🎤 to retry",
	"🛠️ 检查 git status 并跑测试": "🛠️ Check git status & run tests",
	"📦 总结最近一次 commit 改动": "📦 Summarize latest commit changes",
	"🔍 排查当前目录报错日志": "🔍 Diagnose errors in current project",
	"描述你要让远程 AI 执行的开发任务（可点上方上传截图）...": "Describe the coding task for your remote AI agent (you can also attach screenshots)...",
	"输入你想让电脑执行的任务，或点击下方传截图/语音输入...": "Describe the task to run on your remote computer, or attach screenshots/voice below...",
	"📁 项目工作区": "📁 Project Workspaces",
	"💻 执行电脑": "💻 Target Computer",
	"⚡ 执行引擎": "⚡ AI Engine",
	"⚠️ 暂无在线电脑": "⚠️ No Computer Online",
	"选择模型": "Select Model",
	"🤖 默认模型": "🤖 Default Model",
	"🤖 DeepSeek 默认模型": "🤖 DeepSeek Default",
	"🖼️ 截图": "🖼️ Screenshot",
	"📁 选择项目文件夹": "📁 Select Project Folder",
	"搜索项目名称或路径...": "Search project name or path...",
	"未找到匹配的项目文件夹": "No matching project folder found",
	"全部 ▾": "All ▾",
	"🚀 立即在远程电脑启动": "🚀 Launch on Remote Computer",
	"🚀 立即在远程电脑启动任务": "🚀 Launch Task on Remote Computer",
	"📂 项目文件速览": "📂 Project Files",
	"关闭": "Close",
	"‹ 返回目录": "‹ Back to folder",
	"‹ 返回文件列表": "‹ Back to files",
	"🏠 根目录": "🏠 Root",
	"目录": "Folder",
	"📎 插入到输入框": "📎 Quote in Chat",
	"💬 让 AI 分析": "💬 Ask AI",
	"📋 复制": "📋 Copy",
	"还没有接入电脑": "No Computer Connected Yet",
	"请先在电脑终端执行一行安装命令接入本机，即可远程浏览项目代码与文件": "Run the 1-line enrollment command in your computer terminal to browse project files remotely.",
	"👉 去查看一行接入命令": "👉 View 1-Line Setup Command",
	"🔗 端到端加密分享链接已就绪": "🔗 E2EE Share Link Ready",
	"📋 复制加密链接": "📋 Copy Encrypted Link",
	"🌐 打开预览": "🌐 Open Preview",
	"📱 手机扫码 / 6 位配对码登录": "📱 Phone QR / 6-Digit Pairing Login",
	"扫码网址:": "Scan URL:",
	"📋 复制免密链接": "📋 Copy Direct Login Link",
	"🔄 重新生成": "🔄 Regenerate",
	"正在生成 6 位免密配对码…": "Generating 6-digit pairing code…",
	"📋 复制内容": "📋 Copy Content",
	"当前浏览器限制了自动写入剪贴板，请点下方按钮或长按文本框复制：": "Auto-copy was blocked by the browser. Tap the button below or long-press to copy:",
	"📋 点此复制选中文本": "📋 Copy Selected Text",
	"⚡ 极速实时模式 (Rust 原生加速)": "⚡ Turbo Real-Time Mode (Rust Native)",
	"📦 跨电脑一键迁移会话": "📦 Cross-Computer Session Migration",
	"保存标题": "Save Title",
	"📌 取消置顶此对话": "📌 Unpin Conversation",
	"📌 置顶此对话（固定在列表最顶部）": "📌 Pin Conversation to Top",
	"🔗 生成 AES-256 端到端加密回放链接": "🔗 Create AES-256 Encrypted Share Link",
	"🗑️ 删除此条会话记录": "🗑️ Delete Conversation",
	"⚠️ 再次点击确认彻底删除": "⚠️ Tap Again to Confirm Delete",
	"🤖 选择 AI 模型": "🤖 Select AI Model",
	"切换当前对话使用的 AI 模型": "Switch the AI model for this conversation",
	"不强制覆盖，沿用该会话在电脑端已选的模型配置": "Use the default model configured on your computer",
	"当前已选 ✓": "Selected ✓",
	"选择 ›": "Select ›",
	"🤖 默认模型 ▾": "🤖 Default ▾",
	"切换 AI 模型": "Switch AI Model",
	"选择新建对话使用的 AI 模型": "Select AI Model for New Conversation",
	"⬇️ 保存/分享视频": "⬇️ Save / Share Video",
	"⬇️ 保存/分享文件": "⬇️ Save / Share File",
	"⬇️ 保存图片": "⬇️ Save Image",
	"📥 松开手指即可保存或分享图片": "📥 Release finger to save or share image",
	"🌐 交互预览": "🌐 Live Preview",
	"⛶ 全屏体验": "⛶ Fullscreen",
	"🌐 预览": "🌐 Preview",
	"</> 源码": "</> Source",
	"‹ 返回对话": "‹ Back to Chat",
	"🌐 HTML 交互预览": "🌐 HTML Live Preview",
	"重新加载网页": "Reload Webpage",
	"HTML 网页": "HTML Page",
	"体验网页 ›": "Live Preview ›",
	"打开 ›": "Open ›",
	"交付文档": "Artifact",
	"点击直接预览全文与配图": "Tap to preview full doc & media",
	"上拉或点击展开更多": "Drag up or tap to expand",
	"展开显示更多": "Expand drawer",
	"收起高度": "Collapse drawer",
	"确认已阅": "Mark Reviewed",
	"✓ 已确认": "✓ Reviewed",
	"展开 ⌄": "Expand ⌄",
	"收起 ⌃": "Collapse ⌃",
	"📂 浏览全部目录": "📂 Browse All Files",
	"暂无文件改动记录": "No changed files recorded",
	"📲 已缓存 · 再点存入相册/文件": "📲 Ready · Tap to Save",
	"⏳ 准备中…": "⏳ Preparing…",
	"✨ 切回智能兼容秒播": "✨ Back to Smart Stream",
	"✨ 切回自适应秒播流": "✨ Adaptive HLS Stream",
	"🎞️ 切换无损原画流": "🎞️ Lossless Raw Stream",
	"🎞️ 尝试原片直出": "🎞️ Raw Original Stream",
	"🔄 强制重编码兼容流": "🔄 Force Compat Transcode",
	"🔄 播不出？转码兼容播放": "🔄 Compat Transcode",
	"⬇️ 保存原视频到本地播放": "⬇️ Save Original Video",
	"滑卡批阅模式": "Swipe Triage Mode",
	"滑卡批阅": "Swipe Triage",
	"↩ 撤回": "↩ Undo",
	"☰ 列表模式": "☰ List View",
	"☰ 返回会话列表": "☰ Back to Session List",
	"对话 ›": "Chat ›",
	"↪ 稍后看": "↪ Snoozed",
	"我：": "Me: ",
	"搁置": "Snooze",
	"点此查看": "View",
	"查看 ›": "View ›",
	"⤢ 全屏": "⤢ Full",
	"⤡ 半屏": "⤡ Half",
	"收起 ✕": "Close ✕",
	"详情": "Details",
	"点击查看完整提问 ›": "Tap to view full prompt ›",
	"点击查看完整提问与截图 ›": "Tap to view full prompt & image ›",
	"点击展开完整回复全文 ›": "Tap to read full reply ›",
	"短按弹键盘打字 · 长按直接说话": "Tap to type · Hold to speak",
	"🎙️ 正在聆听语音… 松手落入输入框": "🎙️ Listening… Release to insert text",
	"🎙️ 长按说": "🎙️ Hold",
	"🔴 听写中": "🔴 Live",
	"输入你的方案，或继续长按上方追加语音…": "Type your instructions, or hold above to append voice…",
	"发送新方案 👉": "Send New Plan 👉",
	"可点此 或 右滑卡片": "Tap here or swipe right",
	"✍️ 请先输入或长按说话": "✍️ Type or hold to speak first",
	"填写方案后即可点此或右滑发送": "Enter your instructions to unlock",
	"长按此钮 或 右拉稳住0.8s": "Hold button or pull right 0.8s",
	"待处理卡片已全部清零！": "All Pending Cards Cleared!",
	"所有待授权与未读完结会话均已处理完毕。": "All pending approvals and unread conclusions are done.",
	"💬 我发送的完整提问": "💬 My Full Prompt",
	"🔍 点击打开高清原图预览器": "🔍 Tap to open full-res image viewer",
	"⏳ 正在同步完整提问内容…": "⏳ Syncing full prompt…",
	"💻 待执行完整命令": "💻 Full Command to Execute",
	"📖 AI 最新完整回复": "📖 Latest Full AI Reply",
	"⏳ 正在从云端拉取完整未截断全文…": "⏳ Fetching full untruncated reply…",
	"💬 进入完整对话上下文 ›": "💬 Open Full Conversation ›",
	"📨 已发送新方案指令": "📨 Sent new instructions",
	"当前浏览器环境不支持语音听写，请直接键盘输入": "Speech dictation is unavailable in this browser; please type instead",
	"📂 选择目录": "📂 Browse Folder",
	"＋ 新工作区": "＋ New Workspace",
	"✨ 新工作区": "✨ New Workspace",
	"🕒 已有工作区": "🕒 Recent",
	"📁 选择目录或新建工作区": "📁 Browse Folder or New Workspace",
	"✓ 选定此目录作为工作区": "✓ Select This Folder",
	"⬆️ 返回上一级目录": "⬆️ Parent Folder",
	"✨ 创建并选定新工作区": "✨ Create & Select Workspace",
	"📂 父级目录（新文件夹将建在此目录下）": "📂 Parent Directory",
	"📝 新项目文件夹名称（或直接填完整路径）": "📝 New Folder Name (or full path)",
	"例如：my-new-app 或 ~/projects/demo": "e.g. my-new-app or ~/projects/demo",
	"更改父目录…": "Change parent…",
	"正在读取电脑目录…": "Loading remote directory…",
	"此目录下暂无子文件夹": "No subfolders in this directory",
	"↓ 下拉刷新状态": "↓ Pull to refresh",
	"🔄 强制刷新前端版本（清缓存重载）": "🔄 Force Update App (Clear Cache)",
	"💡 提示：左右滑动即可返回会话列表": "💡 Tip: Swipe left or right to return to sessions",
	"全文同步中…": "Syncing full reply…"
};
var REGEX_ZH_TO_EN = [
	[/^🌐 (.+)$/, (_, title) => `🌐 ${title === "对话内 HTML 交互预览" ? "Inline HTML Live Preview" : title}`],
	[/^⏳ 拉取中 (\d+)%…$/, "⏳ Downloading $1%…"],
	[/^⚡ 直连拉取 (\d+)%…$/, "⚡ P2P Direct $1%…"],
	[/^⚡ 已直连拉取 (.+)…$/, "⚡ P2P Direct $1…"],
	[/^⏳ 已拉取 (.+)…$/, "⏳ Downloaded $1…"],
	[/^🎬 (.+) · ⚡ P2P 极速直连 · 零缓冲秒播$/, "🎬 $1 · ⚡ P2P Direct Zero-Buffer"],
	[/^🎬 (.+) · ⚡ HLS 切片秒播 · 抗弱网零卡死$/, "🎬 $1 · ⚡ Adaptive HLS Instant Stream"],
	[/^🎬 (.+) · 无损原画 HLS 切片流$/, "🎬 $1 · Lossless HLS Original Stream"],
	[/^📍 当前工作区：(.+)$/, "📍 Workspace: $1"],
	[/^📍 将创建新工作区：(.+)$/, "📍 Will create workspace: $1"],
	[/^✨ 新建：(.+)$/, "✨ New: $1"],
	[/^🎬 (.+) · ⚡ 720p 极速秒看流 · 拖动秒播$/, "🎬 $1 · ⚡ 720p Fast Preview Stream"],
	[/^🎬 (.+) · 智能 H\.264 兼容流 · 拖动秒播$/, "🎬 $1 · Smart H.264 Compat Stream"],
	[/^🎬 (.+) · 无损快启重封装 · 拖动秒播$/, "🎬 $1 · Fast-Start Lossless Remux"],
	[/^🎬 (.+) · 原始视频字节直出流$/, "🎬 $1 · Raw Original Stream"],
	[/^🎬 (.+) · 支持拖动进度条分片秒播$/, "🎬 $1 · HTTP 206 Byte-Range Stream"],
	[/^🤖 选择模型 · (.+)$/, "🤖 Select Model · $1"],
	[/^✨ 跟随电脑端当前默认 \((.+)\)$/, "✨ Computer Default ($1)"],
	[/^🤖 默认 \((.+)\)$/, "🤖 Default ($1)"],
	[/^🤖 默认 · (.+)$/, "🤖 Default · $1"],
	[/^全部 \((\d+)\) ▾$/, "All ($1) ▾"],
	[/^全部电脑 \((\d+)\)$/, "All Computers ($1)"],
	[/^已接入电脑 \((\d+) 台 · 点击卡片展开详情\)$/, "Connected Computers ($1 · tap card for details)"],
	[/^端到端加密分享记录 \((\d+)\)$/, "Encrypted Share History ($1)"],
	[/^(\d+)\/(\d+) 台设备在线$/, "$1/$2 computers online"],
	[/^一屏混排查看 (\d+) 台电脑共 (\d+) 条会话$/, "Unified view of $2 sessions across $1 computers"],
	[/^(\d+) 条会话 · 🎯 飞书当前主控$/, "$1 sessions · 🎯 Primary Host"],
	[/^(\d+) 条会话 · 在线待命$/, "$1 sessions · Online"],
	[/^(\d+) 条会话 · 离线 \((.+)\)$/, "$1 sessions · Offline ($2)"],
	[/^⏳ (\d+)m有效 · 已连 (\d+) 台 · 点此展开命令$/, "⏳ $1m left · $2 joined · tap to expand"],
	[/^⏳ (\d+) 分钟$/, "⏳ $1 min"],
	[/^💻 (\d+) 台$/, "💻 $1 joined"],
	[/^💬 (\d+) 会话$/, "💬 $1 sessions"],
	[/^💬 (\d+) 会话 \($/, "💬 $1 sessions ("],
	[/^(\d+) 运行中$/, "$1 running"],
	[/^(\d+) 条 · (\d+) 运行 · (.+)$/, "$1 sessions · $2 running · $3"],
	[/^⚪ 离线 \((.+)\)$/, "⚪ Offline ($1)"],
	[/^⏳ (\d+) 条排队$/, "⏳ $1 queued"],
	[/^共 (\d+) 字$/, "$1 chars"],
	[/^💭 思考过程 · 共 (\d+) 步 \(点击展开\)$/, "💭 Thinking · $1 steps (tap to expand)"],
	[/^💭 思考过程 \(点击展开\)$/, "💭 Thinking process (tap to expand)"],
	[/^🔧 执行过程 · 共 (\d+) 次工具调用 \((.+)\) \(点击展开\)$/, "🔧 Executed $1 tool calls ($2) (tap to expand)"],
	[/^⬆️ 为保证秒开已省略前 (\d+) 条早先记录 · 点击加载完整历史$/, "⬆️ $1 earlier messages omitted for speed · Tap to load full history"],
	[/^✅ 已加载全部历史对话（共 (\d+) 条）$/, "✅ All $1 messages loaded"],
	[/^⏳ 有效期剩余 (\d+) 秒（扫码或输入一次后即刻生效）$/, "⏳ Expires in $1s (single-use QR or 6-digit code)"],
	[/^⚠️ 该二维码\/配对码已过期，请点击下方重新生成$/, "⚠️ Code expired. Tap Regenerate below"],
	[/^\((\d+) 条对话\)(.*)$/, (_, count, rest) => {
		return `(${count} msgs)${String(rest || "").replace("· 👀 仅观测", "· 👀 Observe-only").replace("· 🔵 可续聊", "· 🔵 Resumable")}`;
	}],
	[/^(.*)\((\d+) 条对话\)(.*)$/, (_, prefix, count, rest) => {
		return `${prefix}(${count} msgs)${String(rest || "").replace("· 👀 仅观测", "· 👀 Observe-only").replace("· 🔵 可续聊", "· 🔵 Resumable")}`;
	}],
	[/^发指令通过 (.+) CLI 继续对话\.\.\.$/, "Send a prompt to resume via $1 CLI..."],
	[/^📂 查看【(.+)】项目文件夹$/, "📂 Browse [$1] Project Files"],
	[/^⏳ 等待你确认工具调用：(.+)$/, "⏳ Waiting for tool approval: $1"],
	[/^💬 \[(.+)\] (.+)等待你做出选择$/, "💬 [$1] $2Waiting for your choice"],
	[/^⏳ \[(.+)\] (.+)等待你批准工具执行$/, "⏳ [$1] $2Waiting for tool approval"],
	[/^💬 \[(.+)\] (.+)正在同步你的选择到电脑端\.\.\.$/, "💬 [$1] $2Syncing your choice to computer..."],
	[/^⏳ \[(.+)\] (.+)正在同步审批到电脑端\.\.\.$/, "⏳ [$1] $2Syncing approval to computer..."],
	[/^💬 \[(.+)\]「(.+)」待你选择$/, "💬 [$1] \"$2\" needs your choice"],
	[/^⏳ \[(.+)\]「(.+)」待你审批$/, "⏳ [$1] \"$2\" needs approval"],
	[/^🔋 (\d+)% · 充放电正常$/, "🔋 $1% · Battery OK"],
	[/^🔋 (\d+)% · 正在充电$/, "🔋 $1% · Charging"],
	[/^🔋 (\d+)% · 已充满$/, "🔋 $1% · Fully Charged"],
	[/^🔋 (\d+)% · 电池供电(.*)$/, "🔋 $1% · On Battery$2"],
	[/^🪫 (\d+)% · 低电量(.*)$/, "🪫 $1% · Low Battery$2"],
	[/^📶 Wi-Fi \((.+)\) · (\d+)ms$/, "📶 Wi-Fi ($1) · $2ms"],
	[/^📶 Wi-Fi (\d+)ms$/, "📶 Wi-Fi $1ms"],
	[/^🌐 有线\/局域网 \((.+)\) · (\d+)ms$/, "🌐 LAN ($1) · $2ms"],
	[/^🌐 局域网 (\d+)ms$/, "🌐 LAN $1ms"],
	[/^🔒 指纹 $/, "🔒 Fingerprint "],
	[/^ · 🔑 独立凭证 \((.+)\)$/, " · 🔑 Dedicated Token ($1)"],
	[/^ · 🔑 管理员凭证$/, " · 🔑 Admin Token"],
	[/^同步序号 #(\d+)$/, "Sync #$1"],
	[/^⬆️ 可升 v(.+)$/, "⬆️ Update to v$1"],
	[/^v(.+) 最新$/, "v$1 Latest"],
	[/^🔄 一键升级 \(v(.+)\)$/, "🔄 Upgrade (v$1)"],
	[/^DSH 远控总控台 v(.+) · 构建 $/, "DSH Remote Control Hub v$1 · Build "],
	[/^ · 云端启动于 (.+)$/, " · Started $1"],
	[/^刚刚$/, "just now"],
	[/^(\d+)\s*秒前$/, "$1s ago"],
	[/^(\d+)\s*分钟前$/, "$1m ago"],
	[/^(\d+)\s*小时前$/, "$1h ago"],
	[/^(\d+)\s*天前$/, "$1d ago"],
	[/^↩ 撤回 \((\d+)s\)$/, "↩ Undo ($1s)"],
	[/^(\d+)图$/, "$1 img"],
	[/^📄 代码改动 · (\d+) 个文件$/, (_, n) => `📄 Code Changes · ${n} file${Number(n) === 1 ? "" : "s"}`],
	[/^📄 代码改动 \((\d+) 个文件\)$/, (_, n) => `📄 Code Changes (${n} file${Number(n) === 1 ? "" : "s"})`],
	[/^🟢 去列表查看运行中任务 \((\d+)\) ›$/, "🟢 View Running Tasks ($1) ›"]
];
function getLangPref() {
	try {
		if (typeof location !== "undefined" && location.search) {
			const qLang = (new URLSearchParams(location.search).get("lang") || "").trim().toLowerCase();
			if (qLang === "en" || qLang === "zh") {
				try {
					localStorage.setItem("dsh_lang_pref", qLang);
				} catch {}
				return qLang;
			}
		}
		if (typeof localStorage !== "undefined") {
			const saved = (localStorage.getItem("dsh_lang_pref") || "").trim().toLowerCase();
			if (saved === "en" || saved === "zh") return saved;
		}
		if (typeof navigator !== "undefined" && navigator.language) {
			if (String(navigator.language).toLowerCase().startsWith("zh")) return "zh";
			return "en";
		}
	} catch {}
	return "zh";
}
function setLangPreference(nextLang) {
	const norm = nextLang === "en" ? "en" : "zh";
	try {
		localStorage.setItem("dsh_lang_pref", norm);
	} catch {}
	return norm;
}
function translateZhStringToEn(raw) {
	if (!raw || typeof raw !== "string") return raw;
	const trimmed = raw.trim();
	if (!trimmed) return raw;
	if (EXACT_ZH_TO_EN[trimmed]) {
		const lead = raw.match(/^\s*/)?.[0] || "";
		const tail = raw.match(/\s*$/)?.[0] || "";
		return lead + EXACT_ZH_TO_EN[trimmed] + tail;
	}
	for (const [pattern, replacement] of REGEX_ZH_TO_EN) if (pattern.test(trimmed)) {
		const lead = raw.match(/^\s*/)?.[0] || "";
		const tail = raw.match(/\s*$/)?.[0] || "";
		return lead + (typeof replacement === "function" ? trimmed.replace(pattern, replacement) : trimmed.replace(pattern, replacement)) + tail;
	}
	let out = raw;
	for (const [zhSub, enSub] of [
		["🎉 电脑已接入！第 ⑥ 步：点右侧生成二维码，用手机相机扫一扫即可免输密码直接遥控", "🎉 Computer connected! Next step: tap \"Phone QR Login\" on the right and scan with your phone camera"],
		["电脑已接入！第 ⑥ 步", "Computer connected! Next step"],
		["：点右侧生成二维码，用", ": tap the button on the right and scan with your "],
		["手机相机扫一扫", "phone camera"],
		["即可免输密码直接遥控", " for instant passwordless control"],
		["① 终端执行命令", "① Run 1-Line Command"],
		["复制下方一行命令", "Paste in computer terminal"],
		["② 自动连上刷新", "② Auto-Connects Live"],
		["无需重启或手填", "Zero manual config"],
		["③ 手机扫码遥控", "③ Scan QR on Phone"],
		["免输密码直接进", "Instant passwordless login"],
		["用手机相机直接", "Point your phone camera at the "],
		["扫下方二维码", "QR code below"],
		["即可免输密码登录（也可在手机端输入 6 位码）：", " for instant login (or enter the 6-digit code):"],
		["📡 局域网自动修正", "📡 LAN IP Auto-Detected"],
		["：你当前在电脑上用 ", ": You opened this page via "],
		[" 打开（手机扫 localhost 会连不上），已自动将二维码切换为本机局域网地址 ", " (which phones cannot reach). Switched QR code to your LAN IP "],
		["。请确保手机与电脑连同一 Wi-Fi，或在下方改为公网/隧道地址：", ". Keep phone & computer on the same Wi-Fi, or enter a public URL below:"],
		["⚠️ 注意", "⚠️ Note"],
		[" 打开，手机无法直接访问 localhost！请在下方把地址改为电脑的局域网 IP（如 ", " — phones cannot reach localhost! Change the URL below to your computer LAN IP (e.g. "],
		["）或公网域名后再扫码：", ") or public domain before scanning:"],
		["全部 ", "All "],
		["🟢 运行中 ", "🟢 Running "],
		["🔵 已出结论 ", "🔵 Completed "],
		["🧑 我: ", "🧑 Me: "],
		["⚡ 极速", "⚡ Turbo"],
		["🐢 轮询", "🐢 Polling"],
		["(旧版)", "(outdated)"],
		["✅ 远控+审批", "✅ Control + Approve"],
		["🔵 看会话/发指令", "🔵 View & Prompt"],
		["👀 观察模式", "👀 Observe-only"],
		["👀 仅观测", "👀 Observe-only"],
		["豆包电脑版", "Doubao Desktop"],
		["豆包对话", "Doubao Chat"],
		["豆包工作", "Doubao Agent"],
		["⚪ 未安装", "⚪ Not installed"],
		["🔓 解锁成功", "🔓 Unlocked"],
		["🔓 扫码登录成功", "🔓 QR login successful"],
		["🔓 配对解锁成功", "🔓 Paired & unlocked"],
		["🔒 已锁定当前浏览器", "🔒 Browser locked"],
		["📋 已复制到剪贴板", "📋 Copied to clipboard"],
		["📋 手机免密登录链接已复制", "📋 Direct phone login link copied"],
		["📋 一行接入命令已复制！到电脑终端粘贴回车即可", "📋 1-line command copied! Paste and run in your terminal"],
		["📋 本地仓库接入命令已复制", "📋 Local repo command copied"],
		["AI 交付文档 / Walkthrough", "AI Artifacts / Walkthrough"],
		["📝 本会话改动文件", "📝 Changed Files"],
		["· 改动文件", "· Changed Files"]
	]) if (out.includes(zhSub)) out = out.split(zhSub).join(enSub);
	return out;
}
var domHasEnTranslation = false;
function applyLangToDom(root = typeof document !== "undefined" ? document.body : null, lang = getLangPref()) {
	if (!root || typeof document === "undefined") return;
	const isEn = lang === "en";
	if (document.documentElement) document.documentElement.setAttribute("lang", isEn ? "en" : "zh-CN");
	document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
		btn.textContent = isEn ? "🌐 中文" : "🌐 EN";
		btn.setAttribute("title", isEn ? "Switch to Chinese (切换中文)" : "Switch to English");
	});
	if (!isEn && !domHasEnTranslation) return;
	domHasEnTranslation = isEn;
	root.querySelectorAll("[placeholder], [title]").forEach((el) => {
		if (el.hasAttribute("placeholder")) {
			const cur = el.getAttribute("placeholder") || "";
			if (el.dataset.origPlaceholder === void 0) el.dataset.origPlaceholder = cur;
			else if (/[\u4e00-\u9fa5]/.test(cur) && cur !== el.dataset.origPlaceholder) el.dataset.origPlaceholder = cur;
			const orig = el.dataset.origPlaceholder;
			const target = isEn ? translateZhStringToEn(orig) : orig;
			if (cur !== target && document.activeElement !== el) el.setAttribute("placeholder", target);
		}
		if (el.hasAttribute("title") && !el.hasAttribute("data-lang-toggle")) {
			const cur = el.getAttribute("title") || "";
			if (el.dataset.origTitle === void 0) el.dataset.origTitle = cur;
			else if (/[\u4e00-\u9fa5]/.test(cur) && cur !== el.dataset.origTitle) el.dataset.origTitle = cur;
			const orig = el.dataset.origTitle;
			const target = isEn ? translateZhStringToEn(orig) : orig;
			if (cur !== target) el.setAttribute("title", target);
		}
	});
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
	let node = walker.nextNode();
	while (node) {
		const parentEl = node.parentElement;
		const parentTag = parentEl?.tagName;
		if (parentTag !== "SCRIPT" && parentTag !== "STYLE" && parentTag !== "CODE" && parentTag !== "PRE" && parentTag !== "TEXTAREA" && !parentEl?.closest?.("#triageDeckOverlay")) {
			const curVal = node.nodeValue || "";
			if (node.__origZh === void 0) node.__origZh = curVal;
			else if (!isEn && curVal !== node.__origZh && /[\u4e00-\u9fa5]/.test(curVal)) node.__origZh = curVal;
			else if (isEn && /[\u4e00-\u9fa5]/.test(curVal)) node.__origZh = curVal;
			const orig = node.__origZh;
			const target = isEn ? translateZhStringToEn(orig) : orig;
			if (curVal !== target) node.nodeValue = target;
		}
		node = walker.nextNode();
	}
}
// hub/web/src/state/delta-merge.js
function applyStateDelta(prevState, delta) {
	if (!prevState || typeof prevState !== "object" || !Array.isArray(prevState.hosts)) return {
		ok: false,
		reason: "missing_base_state"
	};
	if (!delta || typeof delta !== "object") return {
		ok: false,
		reason: "invalid_delta"
	};
	const curSeq = Number(prevState.stateSeq) || 0;
	const prevSeq = Number(delta.prevSeq) || 0;
	const nextSeq = Number(delta.stateSeq) || 0;
	if (!curSeq || !nextSeq) return {
		ok: false,
		reason: "uninitialized_seq"
	};
	if (curSeq === nextSeq) return {
		ok: true,
		state: prevState,
		noop: true
	};
	if (curSeq !== prevSeq) return {
		ok: false,
		reason: "seq_mismatch",
		curSeq,
		prevSeq,
		nextSeq
	};
	const nextState = { ...prevState };
	if (delta.top && typeof delta.top === "object") Object.assign(nextState, delta.top);
	if (Array.isArray(delta.topDeleted)) for (const k of delta.topDeleted) delete nextState[k];
	nextState.stateSeq = nextSeq;
	if (delta.now !== void 0) nextState.now = delta.now;
	const hasHostChanges = Array.isArray(delta.removedHostIds) && delta.removedHostIds.length > 0 || Array.isArray(delta.hosts) && delta.hosts.length > 0 || Array.isArray(delta.hostOrder);
	const metaOnly = !hasHostChanges && !delta.top && (!Array.isArray(delta.topDeleted) || delta.topDeleted.length === 0);
	if (!hasHostChanges) return {
		ok: true,
		state: nextState,
		noop: false,
		metaOnly
	};
	const removedHostSet = new Set(Array.isArray(delta.removedHostIds) ? delta.removedHostIds : []);
	const hostMap = /* @__PURE__ */ new Map();
	const currentOrder = [];
	for (const h of prevState.hosts) {
		if (!h || !h.hostId || removedHostSet.has(h.hostId)) continue;
		hostMap.set(h.hostId, h);
		currentOrder.push(h.hostId);
	}
	if (Array.isArray(delta.hosts)) for (const patch of delta.hosts) {
		if (!patch || !patch.hostId) continue;
		if (patch.fullHost) {
			if (!hostMap.has(patch.hostId)) currentOrder.push(patch.hostId);
			hostMap.set(patch.hostId, patch.fullHost);
			continue;
		}
		const prevHost = hostMap.get(patch.hostId);
		if (!prevHost) return {
			ok: false,
			reason: "missing_host_for_patch",
			hostId: patch.hostId
		};
		const nextHost = { ...prevHost };
		if (patch.hostMeta && typeof patch.hostMeta === "object") Object.assign(nextHost, patch.hostMeta);
		if (Array.isArray(patch.hostMetaDeleted)) for (const k of patch.hostMetaDeleted) delete nextHost[k];
		if (patch.bridgeMeta || Array.isArray(patch.bridgeMetaDeleted) && patch.bridgeMetaDeleted.length > 0 || Array.isArray(patch.removedTaskIds) && patch.removedTaskIds.length > 0 || Array.isArray(patch.upsertedTasks) && patch.upsertedTasks.length > 0 || Array.isArray(patch.taskOrder)) {
			const prevBridge = prevHost.bridgeState && typeof prevHost.bridgeState === "object" ? prevHost.bridgeState : {
				tasks: [],
				approvals: [],
				workspaces: []
			};
			const nextBridge = { ...prevBridge };
			if (patch.bridgeMeta && typeof patch.bridgeMeta === "object") Object.assign(nextBridge, patch.bridgeMeta);
			if (Array.isArray(patch.bridgeMetaDeleted)) for (const k of patch.bridgeMetaDeleted) delete nextBridge[k];
			if (Array.isArray(patch.removedTaskIds) && patch.removedTaskIds.length > 0 || Array.isArray(patch.upsertedTasks) && patch.upsertedTasks.length > 0 || Array.isArray(patch.taskOrder)) {
				const removedTaskSet = new Set(Array.isArray(patch.removedTaskIds) ? patch.removedTaskIds : []);
				const taskMap = /* @__PURE__ */ new Map();
				const curTaskOrder = [];
				for (const t of Array.isArray(prevBridge.tasks) ? prevBridge.tasks : []) {
					if (!t || !t.id || removedTaskSet.has(t.id)) continue;
					taskMap.set(t.id, t);
					curTaskOrder.push(t.id);
				}
				if (Array.isArray(patch.upsertedTasks)) for (const ut of patch.upsertedTasks) {
					if (!ut || !ut.id) continue;
					if (!taskMap.has(ut.id)) curTaskOrder.push(ut.id);
					taskMap.set(ut.id, ut);
				}
				const finalTaskOrder = Array.isArray(patch.taskOrder) ? patch.taskOrder : curTaskOrder;
				const nextTasks = [];
				const includedIds = /* @__PURE__ */ new Set();
				for (const tid of finalTaskOrder) {
					const taskObj = taskMap.get(tid);
					if (!taskObj) return {
						ok: false,
						reason: "missing_task_in_order",
						hostId: patch.hostId,
						taskId: tid
					};
					nextTasks.push(taskObj);
					includedIds.add(tid);
				}
				for (const [tid, taskObj] of taskMap.entries()) if (!includedIds.has(tid)) nextTasks.push(taskObj);
				nextBridge.tasks = nextTasks;
			}
			nextHost.bridgeState = nextBridge;
		}
		hostMap.set(patch.hostId, nextHost);
	}
	const finalHostOrder = Array.isArray(delta.hostOrder) ? delta.hostOrder : currentOrder;
	const nextHosts = [];
	const addedHosts = /* @__PURE__ */ new Set();
	for (const hid of finalHostOrder) {
		const hObj = hostMap.get(hid);
		if (!hObj) return {
			ok: false,
			reason: "missing_host_in_order",
			hostId: hid
		};
		nextHosts.push(hObj);
		addedHosts.add(hid);
	}
	for (const [hid, hObj] of hostMap.entries()) if (!addedHosts.has(hid)) nextHosts.push(hObj);
	nextState.hosts = nextHosts;
	return {
		ok: true,
		state: nextState,
		noop: false,
		metaOnly
	};
}
// hub/web/src/utils/image-compress.js
var MAX_DIMENSION_PX = 1440;
var MAX_CANVAS_AREA_PX = 36e5;
var MAX_RAW_FALLBACK_BYTES = 1258291.2;
function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(/* @__PURE__ */ new Error("读取图片失败"));
		reader.readAsDataURL(file);
	});
}
function loadImageElement(src) {
	return new Promise((resolve, reject) => {
		const el = new Image();
		el.decoding = "async";
		el.onload = () => resolve(el);
		el.onerror = () => reject(/* @__PURE__ */ new Error("Image decode failed"));
		el.src = src;
	});
}
function encodeCanvasJpeg(img, targetW, targetH, quality) {
	const canvas = document.createElement("canvas");
	canvas.width = targetW;
	canvas.height = targetH;
	try {
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, targetW, targetH);
		ctx.drawImage(img, 0, 0, targetW, targetH);
		return canvas.toDataURL("image/jpeg", quality);
	} finally {
		canvas.width = 0;
		canvas.height = 0;
	}
}
async function compressImageFile(file) {
	if (!file) throw new Error("未选择图片文件");
	const origMime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
	const origName = file.name || `screenshot-${Date.now()}.jpg`;
	const baseName = origName.replace(/\.[a-zA-Z0-9]+$/, "") || "screenshot";
	const canUseObjectUrl = typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
	let objectUrl = "";
	try {
		const decodeSrc = canUseObjectUrl ? (objectUrl = URL.createObjectURL(file), objectUrl) : await readFileAsDataUrl(file);
		const img = await loadImageElement(decodeSrc);
		const w = img.naturalWidth || img.width || 0;
		const h = img.naturalHeight || img.height || 0;
		if (w > 0 && h > 0) {
			const area = w * h;
			const needsResize = w > MAX_DIMENSION_PX || h > MAX_DIMENSION_PX || area > MAX_CANVAS_AREA_PX;
			const needsCompress = (file.size || 0) > 225280;
			if (!needsResize && !needsCompress) {
				const smallDataUrl = objectUrl ? await readFileAsDataUrl(file) : decodeSrc;
				const commaIdx = smallDataUrl.indexOf(",");
				const rawBase64 = commaIdx >= 0 ? smallDataUrl.slice(commaIdx + 1) : smallDataUrl;
				return {
					name: origName,
					mimeType: origMime,
					dataBase64: rawBase64,
					previewUrl: smallDataUrl,
					sizeBytes: file.size || Math.round(rawBase64.length * 3 / 4),
					width: w,
					height: h
				};
			}
			const sideScale = MAX_DIMENSION_PX / Math.max(w, h);
			const areaScale = Math.sqrt(MAX_CANVAS_AREA_PX / area);
			const scale = Math.min(1, sideScale, areaScale);
			let targetW = Math.max(1, Math.round(w * scale));
			let targetH = Math.max(1, Math.round(h * scale));
			let outDataUrl = encodeCanvasJpeg(img, targetW, targetH, .8);
			if (outDataUrl && outDataUrl.length > 65e4) outDataUrl = encodeCanvasJpeg(img, targetW, targetH, .62) || outDataUrl;
			if (outDataUrl && outDataUrl.length > 9e5) {
				targetW = Math.max(1, Math.round(targetW * .75));
				targetH = Math.max(1, Math.round(targetH * .75));
				outDataUrl = encodeCanvasJpeg(img, targetW, targetH, .58) || outDataUrl;
			}
			if (outDataUrl) {
				const outComma = outDataUrl.indexOf(",");
				const outBase64 = outComma >= 0 ? outDataUrl.slice(outComma + 1) : outDataUrl;
				return {
					name: `${baseName}.jpg`,
					mimeType: "image/jpeg",
					dataBase64: outBase64,
					previewUrl: outDataUrl,
					sizeBytes: Math.round(outBase64.length * 3 / 4),
					width: targetW,
					height: targetH
				};
			}
		}
	} catch {} finally {
		if (objectUrl) try {
			URL.revokeObjectURL(objectUrl);
		} catch {}
	}
	if ((file.size || 0) > MAX_RAW_FALLBACK_BYTES) throw new Error("图片体积过大或格式暂不支持直接解码，请截图为 PNG/JPG 后重试");
	const fallbackDataUrl = await readFileAsDataUrl(file);
	const commaIdx = fallbackDataUrl.indexOf(",");
	const rawBase64 = commaIdx >= 0 ? fallbackDataUrl.slice(commaIdx + 1) : fallbackDataUrl;
	return {
		name: origName,
		mimeType: origMime,
		dataBase64: rawBase64,
		previewUrl: fallbackDataUrl,
		sizeBytes: file.size || Math.round(rawBase64.length * 3 / 4)
	};
}
// hub/web/src/utils/semver.js
function compareSemver(a, b) {
	const pa = String(a || "").trim().replace(/^v/i, "").split(/[.-]/).map((x) => Number(x) || 0);
	const pb = String(b || "").trim().replace(/^v/i, "").split(/[.-]/).map((x) => Number(x) || 0);
	for (let i = 0; i < 3; i += 1) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
	return 0;
}
// hub/web/src/utils/speech.js
var DIGIT_ZH = {
	"0": "零",
	"1": "一",
	"2": "二",
	"3": "三",
	"4": "四",
	"5": "五",
	"6": "六",
	"7": "七",
	"8": "八",
	"9": "九"
};
var EN_ORDINALS = {
	1: "First,",
	2: "Second,",
	3: "Third,",
	4: "Fourth,",
	5: "Fifth,"
};
var EN_STOPWORDS = /* @__PURE__ */ new Set([
	"the",
	"and",
	"for",
	"that",
	"with",
	"this",
	"from",
	"your",
	"you",
	"have",
	"has",
	"had",
	"was",
	"were",
	"are",
	"been",
	"into",
	"when",
	"just",
	"only",
	"also",
	"than",
	"then",
	"they",
	"them",
	"their",
	"there",
	"what",
	"which",
	"while",
	"where",
	"will",
	"would",
	"should",
	"could",
	"about",
	"after",
	"before",
	"because",
	"under",
	"over"
]);
var CJK_RE = /[\u4e00-\u9fa5]/;
var CJK_GLOBAL_RE = /[\u4e00-\u9fa5]/g;
var EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]/gu;
function hasCjk(s) {
	return CJK_RE.test(String(s || ""));
}
function digitsBitByBitZh(s) {
	return String(s).split("").map((ch) => DIGIT_ZH[ch] ?? ch).join("");
}
function detectSpeechLang(rawMarkdown) {
	const prose = String(rawMarkdown || "").replace(/```[\s\S]*?```/g, "");
	return (prose.match(CJK_GLOBAL_RE) || []).length / 4.2 >= (prose.match(/[a-zA-Z]{2,}/g) || []).length / 2.8 ? "zh" : "en";
}
function inferLocalLang(prevCtx, nextCtx, docLang = "zh") {
	const tight = `${String(prevCtx || "").slice(-7)} ${String(nextCtx || "").slice(0, 7)}`;
	const tightCjk = (tight.match(CJK_GLOBAL_RE) || []).length;
	const tightEn = (tight.match(/[a-zA-Z]{2,}/g) || []).length;
	if (tightEn >= 1 && tightCjk === 0) return "en";
	if (tightCjk >= 1 && tightEn === 0) return "zh";
	const win = `${prevCtx || ""} ${nextCtx || ""}`;
	const cjkSec = (win.match(CJK_GLOBAL_RE) || []).length / 4.2;
	const enSec = (win.match(/[a-zA-Z]{2,}/g) || []).length / 2.8;
	if (Math.abs(cjkSec - enSec) < .2) return docLang;
	return cjkSec > enSec ? "zh" : "en";
}
function splitIdentifierSubwords(token) {
	return String(token).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2").split(/[_\-./:\\\s]+/).filter(Boolean);
}
function extOf(filename) {
	const m = /(\.[a-zA-Z0-9]{1,6})$/.exec(String(filename || ""));
	return m ? m[1].toLowerCase() : "";
}
function mimeCategory(filename, lang) {
	const ext = extOf(filename);
	const zh = lang === "zh";
	if ([
		".mp4",
		".mov",
		".m4v",
		".webm",
		".mkv",
		".avi"
	].includes(ext)) return {
		kind: "video",
		label: zh ? "视频文件" : "the video file"
	};
	if ([
		".jpg",
		".jpeg",
		".png",
		".gif",
		".webp",
		".svg",
		".heic"
	].includes(ext)) return {
		kind: "image",
		label: zh ? "图片文件" : "the image file"
	};
	if ([
		".mp3",
		".m4a",
		".wav",
		".aac",
		".ogg"
	].includes(ext)) return {
		kind: "audio",
		label: zh ? "音频文件" : "the audio file"
	};
	if ([
		".yml",
		".yaml",
		".json",
		".toml",
		".ini",
		".env"
	].includes(ext)) return {
		kind: "config",
		label: zh ? "配置文件" : "the config file"
	};
	if ([
		".md",
		".txt",
		".rst",
		".pdf"
	].includes(ext)) return {
		kind: "doc",
		label: zh ? "文档" : "the doc file"
	};
	if ([
		".sh",
		".bash",
		".zsh"
	].includes(ext)) return {
		kind: "script",
		label: zh ? "脚本" : "the script"
	};
	if ([
		".js",
		".mjs",
		".cjs",
		".ts",
		".tsx",
		".jsx",
		".py",
		".go",
		".rs",
		".java"
	].includes(ext)) return {
		kind: "code",
		label: zh ? "代码文件" : "the source file"
	};
	return {
		kind: "",
		label: ""
	};
}
function contextHasMimeKind(ctx, kind) {
	if (!kind) return false;
	if (kind === "video") return /视频|\bvideo\b/i.test(ctx);
	if (kind === "image") return /图片|出图|\b(?:image|photo|screenshot)\b/i.test(ctx);
	if (kind === "audio") return /音频|语音|\baudio\b/i.test(ctx);
	if (kind === "config") return /配置|\b(?:config|workflow|yaml)\b/i.test(ctx);
	if (kind === "script") return /脚本|\bscript\b/i.test(ctx);
	if (kind === "doc") return /文档|\bdoc\b/i.test(ctx);
	if (kind === "code") return /代码|源文件|测试文件|\b(?:file|module|source|test)\b/i.test(ctx);
	return false;
}
function verbalizeTokenUnified(rawToken, prevCtx = "", nextCtx = "", docLang = "zh") {
	const t = String(rawToken || "").replace(EMOJI_RE, "").trim().replace(/^['"`]+|['"`]+$/g, "").trim();
	if (!t) return "";
	if (hasCjk(t)) return t.replace(/^[[\]()]+|[[\]()]+$/g, "").trim();
	const lang = inferLocalLang(prevCtx, nextCtx, docLang);
	const ctx = `${prevCtx} ${nextCtx}`;
	if (/^(?:sk-|hst_|ghp_|xoxb-|<!--)/i.test(t) || /\.\.\.$/.test(t)) return "";
	if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(t)) {
		if (/IP|地址|\baddress\b/i.test(ctx)) return "";
		return lang === "zh" ? "对应地址" : "that IP address";
	}
	const semver = /^v?(\d+)\.(\d+)\.(\d+)$/i.exec(t);
	if (semver) {
		if (lang === "zh") {
			const zv = `${digitsBitByBitZh(semver[1])}点${digitsBitByBitZh(semver[2])}点${digitsBitByBitZh(semver[3])}`;
			return /版本/.test(ctx) ? zv : `${zv}版本`;
		}
		const ev = `${semver[1]}.${semver[2]}.${semver[3]}`;
		return /\b(?:version|release)\b/i.test(ctx) ? ev : `version ${ev}`;
	}
	if (/^[\d.,:%+\-~～/<>\s]+$/.test(t) || /^<?\s*\d[\d,.]*\s*[A-Za-z/]{1,8}$/.test(t)) return t;
	if (/\s/.test(t)) {
		if (/(?:^|\s)-{1,2}[a-zA-Z]|\b[A-Z0-9_]+=\S+|\s(?:&&|\|\||[|>])\s|\.[a-zA-Z]{2,4}\b/.test(t)) {
			if (/命令|\b(?:command|run|execute)\b/i.test(ctx)) return "";
			return lang === "zh" ? "一段终端命令" : "a terminal command";
		}
		const refMatch = /^(.+?)\s+#(\d+)$/.exec(t);
		if (refMatch) {
			const prefix = refMatch[1].trim();
			const num = refMatch[2];
			if (prefix.length <= 6 && !prefix.includes("-")) return lang === "zh" ? `${prefix} 第${num}号` : `${prefix} run ${num}`;
			return lang === "zh" ? `第${num}号任务` : `run number ${num}`;
		}
		if (t.split(/\s+/).every((w) => /^[A-Za-z0-9,.:;!?'\-()]+$/.test(w) && w.length <= 18)) return t;
		return "";
	}
	if (/^[0-9a-f]{6,40}(?:-[0-9a-f]{4,12})+$/i.test(t) || /^[0-9a-f]{7,40}$/i.test(t) && /\d/.test(t) && /[a-f]/i.test(t)) {
		if (/提交|哈希|\b(?:commit|hash|revision)\b/i.test(ctx)) return "";
		return lang === "zh" ? "某次提交" : "that commit";
	}
	if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+(?:=\S+)?$/.test(t) || /^[A-Z][A-Z0-9_]*=\S+$/.test(t)) {
		const eqVal = /=(\d+)$/.exec(t);
		if (/线程|配置|参数|变量|\b(?:thread|pool|variable|env|setting|limit)\b/i.test(ctx)) return "";
		if (eqVal) return lang === "zh" ? `参数设为${eqVal[1]}` : `a setting of ${eqVal[1]}`;
		return lang === "zh" ? "系统参数" : "an environment variable";
	}
	if (/^-{1,2}[a-zA-Z0-9][\w-]*$/.test(t)) {
		if (/参数|选项|\b(?:flag|option)\b/i.test(ctx)) return "";
		return lang === "zh" ? "命令参数" : "a CLI flag";
	}
	const jsRuntime = /^([A-Z][a-zA-Z0-9]{1,8})\.js$/.exec(t);
	if (jsRuntime) return `${jsRuntime[1]} JS`;
	const htmlTag = /^<\/?([a-zA-Z][a-zA-Z0-9:-]*)(?:\s[\s\S]*)?\/?>$/.exec(t);
	if (htmlTag) {
		const tagName = htmlTag[1];
		if (/标签|元素|组件|\b(?:tag|element)\b/i.test(ctx)) return tagName;
		return lang === "zh" ? `${tagName}标签` : `the ${tagName} tag`;
	}
	const KNOWN_FILE_EXTS = /* @__PURE__ */ new Set([
		".js",
		".mjs",
		".cjs",
		".ts",
		".tsx",
		".jsx",
		".py",
		".go",
		".rs",
		".java",
		".c",
		".cpp",
		".h",
		".hpp",
		".cs",
		".rb",
		".php",
		".swift",
		".kt",
		".sh",
		".bash",
		".zsh",
		".yml",
		".yaml",
		".json",
		".jsonl",
		".toml",
		".ini",
		".env",
		".md",
		".mdx",
		".txt",
		".rst",
		".pdf",
		".html",
		".htm",
		".css",
		".scss",
		".sql",
		".mp4",
		".mov",
		".m4v",
		".webm",
		".mkv",
		".avi",
		".jpg",
		".jpeg",
		".png",
		".gif",
		".webp",
		".svg",
		".heic",
		".ico",
		".mp3",
		".m4a",
		".wav",
		".aac",
		".ogg",
		".zip",
		".tar",
		".gz",
		".tgz",
		".dmg",
		".pkg",
		".plist",
		".db",
		".sqlite",
		".lock",
		".wasm",
		".vue",
		".svelte"
	]);
	const tokenExt = extOf(t);
	if (t.includes("/") || KNOWN_FILE_EXTS.has(tokenExt)) {
		if (/^[A-Za-z0-9_-]+\/$/.test(t)) return t.slice(0, -1);
		const homeMatch = /^~\/([A-Za-z0-9_-]+)$/.exec(t);
		if (homeMatch) {
			if (lang === "zh") return /目录|文件夹/.test(ctx) ? "" : "主目录文件夹";
			return /\b(?:folder|directory)\b/i.test(ctx) ? homeMatch[1] : `the ${homeMatch[1]} folder`;
		}
		const segs = t.split("/").filter(Boolean);
		if (t.startsWith("/api/") || t.startsWith("/") && segs.length <= 2 && segs[0] && !/^(?:users|home|var|tmp|opt|etc)$/i.test(segs[0])) {
			if (/接口|路由|\b(?:endpoint|route|channel)\b/i.test(ctx)) return "";
			return lang === "zh" ? "后端接口" : "the API endpoint";
		}
		if (t.startsWith("/") && !/\.[a-zA-Z][a-zA-Z0-9]{0,5}$/.test(t)) {
			if (/\bDocuments\b/.test(t)) return lang === "zh" ? "系统文稿目录" : "your Documents folder";
			return lang === "zh" ? "对应目录" : "that folder";
		}
		const base = segs.pop() || "";
		if (!base || base === "...") return "";
		const stem = base.replace(/\.[a-zA-Z][a-zA-Z0-9]{0,5}$/, "");
		const subwords = splitIdentifierSubwords(stem);
		const mime = mimeCategory(base, lang);
		if (!t.includes("/") && stem.length <= 8 && subwords.length <= 2 && !/\d{2,}/.test(stem)) {
			if (mime.label && contextHasMimeKind(ctx, mime.kind)) return stem;
			return mime.label ? lang === "zh" ? `${stem}${mime.label}` : `the ${stem} file` : stem;
		}
		if (contextHasMimeKind(ctx, mime.kind)) return "";
		return mime.label || (lang === "zh" ? "对应文件" : "that file");
	}
	if (/^[a-zA-Z_$][\w$]*\([^)]*\)$/.test(t)) {
		const fnName = t.slice(0, t.indexOf("("));
		if (fnName.length <= 7 && splitIdentifierSubwords(fnName).length === 1) return fnName;
		if (/函数|方法|\b(?:function|helper|method|handler)\b/i.test(ctx)) return "";
		return lang === "zh" ? "内部函数" : "an internal helper";
	}
	if (/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+\([^)]*\)$/.test(t)) {
		if (/函数|方法|调用|\b(?:function|helper|method|call)\b/i.test(ctx)) return "";
		return lang === "zh" ? "对应方法" : "that method call";
	}
	if (/^[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*$/.test(t)) {
		const [objName, propName] = t.split(".");
		if (objName.length <= 6 && propName.length <= 6 && splitIdentifierSubwords(propName).length === 1) return `${objName} ${propName}`;
		if (/属性|字段|状态|\b(?:property|field|state)\b/i.test(ctx)) return "";
		return lang === "zh" ? "对应属性" : "that property";
	}
	const letters = (t.match(/[a-zA-Z]/g) || []).length;
	const vowels = (t.match(/[aeiouyAEIOUY]/g) || []).length;
	const subwords = splitIdentifierSubwords(t);
	const vowelRatio = letters > 0 ? vowels / letters : 0;
	if (t.includes("-")) {
		const parts = t.split("-").filter(Boolean);
		const maxAlpha = Math.max(0, ...parts.map((p) => /^[a-z]+$/i.test(p) ? p.length : 0));
		const allLowerSlug = /^[a-z0-9.-]+$/.test(t) && maxAlpha >= 6;
		if (maxAlpha >= 11 || lang === "zh" && allLowerSlug) {
			if (/电脑|主机|机器|目录|\b(?:host|machine|mac\w*|mini|laptop|server)\b/i.test(ctx)) return "";
			return "";
		}
		return parts.filter((p) => !/^(?:instruct|preview|latest)$/i.test(p)).join(" ");
	}
	if (subwords.length >= 3 || t.length > 15) {
		if (/调|调用|\b(?:call|called|calling|invok\w*)\b/i.test(prevCtx)) return lang === "zh" ? "内部函数" : "an internal helper";
		if (/函数|方法|模块|逻辑|\b(?:function|helper|method|handler|module)\b/i.test(ctx)) return "";
		return lang === "zh" ? "内部模块" : "an internal handler";
	}
	if (letters >= 5 && vowelRatio < .15) return "";
	return t.replace(/[<>{}[\]\\|^=]+/g, " ").replace(/\s{2,}/g, " ").trim();
}
function normalizeNSWUnified(input) {
	let s = String(input || "");
	s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
	s = s.replace(/\b(\d+)0000(?=\s*[A-Za-z])/g, (m, n, offset, full) => {
		return hasCjk(full.slice(Math.max(0, offset - 12), offset + m.length + 12)) ? `${n}万` : m;
	});
	s = s.replace(/\b(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\b(?!\s*(?:AM|PM|am|pm))/g, (m, h, min, sec, offset, full) => {
		if (!hasCjk(full.slice(Math.max(0, offset - 12), offset + m.length + 12))) return m;
		const hStr = Number(h) === 0 ? "零" : String(Number(h));
		return sec !== void 0 ? `${hStr}点${Number(min)}分${Number(sec)}秒` : `${hStr}点${Number(min)}分`;
	});
	s = s.replace(/\bv?(\d+)\.(\d+)\.(\d+)\b/g, (m, a, b, c, offset, full) => {
		return hasCjk(full.slice(Math.max(0, offset - 10), offset + m.length + 10)) ? `${digitsBitByBitZh(a)}点${digitsBitByBitZh(b)}点${digitsBitByBitZh(c)}` : m;
	});
	s = s.replace(/[¥￥]\s*(\d+(?:\.\d+)?)\s*元?/g, "$1元");
	s = s.replace(/(\d+(?:\.\d+)?\s*(?:万|千|百)?\s*(?:元|块|次|个|条|字|请求|Token|TPM|RPM|KB|MB|GB)?)\s*\/\s*(分钟|秒|小时|天|月|年|(?:千|万|百万)\s*(?:Token|字|次|条)|Token|字|次|人|台)/gi, "$1每$2");
	s = s.replace(/(\$\d+(?:\.\d+)?|\b\d+\s*[A-Za-z]+)\s*\/\s*(1K\s+\w+|minute|second|hour|day|month)/gi, "$1 per $2");
	const isZhMetric = (full, offset, len) => {
		const before = full.slice(Math.max(0, offset - 8), offset);
		const after = full.slice(offset + len, offset + len + 8);
		if (/[a-zA-Z]{2,}\s*$/.test(before) || /^\s*[a-zA-Z]{2,}/.test(after)) return false;
		return hasCjk(before + after);
	};
	s = s.replace(/<\s*(\d+(?:\.\d+)?)\s*ms\b/gi, (m, n, off, full) => isZhMetric(full, off, m.length) ? `不到${n}毫秒` : `under ${n} milliseconds`);
	s = s.replace(/\b(\d+(?:\.\d+)?)\s*ms\b/gi, (m, n, off, full) => isZhMetric(full, off, m.length) ? `${n}毫秒` : `${n} milliseconds`);
	s = s.replace(/\b(\d+(?:\.\d+)?)\s*s\b/g, (m, n, off, full) => isZhMetric(full, off, m.length) ? `${n}秒` : `${n} seconds`);
	s = s.replace(/\b(\d+(?:\.\d+)?)x\b/gi, (m, n, off, full) => isZhMetric(full, off, m.length) ? `${n}倍速` : m);
	s = s.replace(/#(\d+)/g, (m, n, off, full) => hasCjk(full.slice(Math.max(0, off - 8), off + m.length + 8)) ? `第${n}号` : `number ${n}`);
	s = s.replace(/(\d+(?:\.\d+)?|[零一二两三四五六七八九十百千万点分秒]+)\s*[～~—–]\s*(\d+(?:\.\d+)?|[零一二两三四五六七八九十百千万点分秒]+)/g, "$1到$2");
	s = s.replace(/(\d+)\.(\d+)/g, (m, ip, dp, off, full) => {
		if (!hasCjk(full.slice(Math.max(0, off - 10), off + m.length + 10))) return m;
		return `${ip.length === 1 ? DIGIT_ZH[ip] ?? ip : ip}点${digitsBitByBitZh(dp)}`;
	});
	s = s.replace(/(?<!\d)2\s*(?=[个条项次台秒分钟步套种层道倍千百])/g, "两");
	s = s.replace(/(?<!\d)0\s*(?=[\u4e00-\u9fa5])/g, "零");
	s = s.replace(/\s*(?:→|->)\s*/g, (m, off, full) => hasCjk(full.slice(Math.max(0, off - 10), off + m.length + 10)) ? "，然后" : ", then ");
	s = s.replace(/\s*&\s*/g, (m, off, full) => hasCjk(full.slice(Math.max(0, off - 8), off + m.length + 8)) ? "和" : " and ");
	s = s.replace(/([\u4e00-\u9fa5])\s*\/\s*([\u4e00-\u9fa5])/g, "$1或$2");
	s = s.replace(/\b([a-zA-Z]{2,})\s*\/\s*([a-zA-Z]{2,})\b/g, "$1 or $2");
	s = s.replace(/\b(?:the|a|an)\s+(the|a|an)\b/gi, "$1");
	return s;
}
function cleanInlineUnified(rawLine, docLang) {
	let line = String(rawLine || "").replace(/\*\*|~~/g, "");
	const slots = [];
	const stash = (val, wasDropped = false) => {
		const id = `\uE000${slots.length}\uE001`;
		slots.push({
			val,
			wasDropped
		});
		return id;
	};
	line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, _url, offset, full) => {
		const cleanLabel = label.replace(/^`+|`+$/g, "").trim();
		const prev = full.slice(Math.max(0, offset - 16), offset);
		const next = full.slice(offset + m.length, offset + m.length + 16);
		if (!hasCjk(cleanLabel) && (/^`/.test(label.trim()) || /[/_.]|[a-z][A-Z]/.test(cleanLabel))) {
			const res = verbalizeTokenUnified(cleanLabel, prev, next, docLang);
			return stash(res, res === "");
		}
		return stash(cleanLabel, false);
	});
	line = line.replace(/[（(]([^（）()]*)[)）]/g, (fullMatch, inner, offset, full) => {
		const trimmed = inner.trim();
		if (!trimmed) return "";
		if (/[`=/_{}[\];]/.test(trimmed) || /--[a-z]/i.test(trimmed) || /^(?:v?\d+\.\d+(?:\.\d+)?|(?:commit\s+)?[0-9a-f]{7,40}|#\d+|\d{3}(?:\s+[A-Z][A-Za-z ]+)?|HTTP\s+\d{3})$/i.test(trimmed)) return "";
		const prevChar = full.slice(Math.max(0, offset - 2), offset).trim();
		const enWordCount = (trimmed.match(/[a-zA-Z]+/g) || []).length;
		if (!hasCjk(trimmed) && hasCjk(prevChar) && enWordCount <= 3) return "";
		const localZh = hasCjk(trimmed) || hasCjk(prevChar);
		const after = full.slice(offset + fullMatch.length, offset + fullMatch.length + 3).trim();
		if (/^[:：里中上下内外的]/.test(after)) return ` ${trimmed} `;
		return localZh ? `，${trimmed}，` : `, ${trimmed}, `;
	});
	line = line.replace(/`{3,}([^`]+)`{3,}/g, (m, inner, offset, full) => {
		const res = verbalizeTokenUnified(inner.replace(/`/g, "").trim(), full.slice(Math.max(0, offset - 16), offset), full.slice(offset + m.length, offset + m.length + 16), docLang);
		return stash(res, res === "");
	});
	line = line.replace(/`([^`]+)`/g, (m, code, offset, full) => {
		const res = verbalizeTokenUnified(code, full.slice(Math.max(0, offset - 16), offset), full.slice(offset + m.length, offset + m.length + 16), docLang);
		return stash(res, res === "");
	});
	line = line.replace(/https?:\/\/[^\s)）]+/g, (m, offset, full) => {
		const near = full.slice(Math.max(0, offset - 10), offset + m.length + 10);
		return stash(hasCjk(near) ? "网页链接" : "a web link", false);
	});
	line = line.replace(/(?:^|[\s（(])(\/[A-Za-z0-9_./-]{4,}|~\/[A-Za-z0-9_./-]+)/g, (m, p1, offset, full) => {
		const lead = m.slice(0, m.length - p1.length);
		const res = verbalizeTokenUnified(p1, full.slice(Math.max(0, offset - 14), offset), full.slice(offset + m.length, offset + m.length + 14), docLang);
		return lead + stash(res, res === "");
	});
	line = line.replace(/<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:\s[^<>]*)?\/?>/g, " ");
	if (docLang === "zh") line = line.replace(/[a-zA-Z_][a-zA-Z0-9_./:-]{2,}/g, (m, offset, full) => {
		if (m.includes("") || m.includes("")) return m;
		const res = verbalizeTokenUnified(m, full.slice(Math.max(0, offset - 12), offset), full.slice(offset + m.length, offset + m.length + 12), docLang);
		return stash(res, res === "");
	});
	line = line.replace(/\uE000(\d+)\uE001(\s*[里中]的)?/g, (_m, idxStr, locSuffix) => {
		const slot = slots[Number(idxStr)];
		if (!slot) return locSuffix || "";
		if (!slot.val && slot.wasDropped && locSuffix) return "里面的";
		return `${slot.val}${locSuffix || ""}`;
	});
	line = normalizeNSWUnified(line);
	const circledMap = {
		"①": "第一，",
		"②": "第二，",
		"③": "第三，",
		"④": "第四，"
	};
	line = line.replace(/[①②③④]/g, (m) => circledMap[m] || "");
	line = line.replace(EMOJI_RE, "").replace(/\*|`/g, "").replace(/[<>{}[\]\\|^=]+/g, " ").replace(/[「」『』“”"]/g, " ").replace(/——/g, "，").replace(/\s*—\s*/g, ", ").replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2").replace(/\s+([,.;:!?])/g, "$1").replace(/\s*([，。！？；：、])\s*/g, "$1").replace(/[，、]{2,}/g, "，").replace(/[，、；]+([：。！？；])/g, "$1").replace(/([：。！？；])[，、]+/g, "$1").replace(/\s{2,}/g, " ").replace(/^[,;:\s，、；：]+/, "").trim();
	return line;
}
function ensurePunctUnified(s, docLang) {
	let out = String(s || "").replace(/[,;:，、；：\s]+$/, "").replace(/([。！？.!?])\s*[。！？，、；：,;:]+/g, "$1").trim();
	if (!out) return "";
	const localZh = hasCjk(out) || docLang === "zh";
	if (!/[.!?。！？]$/.test(out)) out += localZh ? "。" : ".";
	return out;
}
function formatCodeFenceLangLabel(rawLang, docLang) {
	const k = String(rawLang || "").trim().toLowerCase();
	if (!k) return "";
	return docLang === "zh" ? {
		py: "Python",
		python: "Python",
		js: "JavaScript",
		javascript: "JavaScript",
		mjs: "JavaScript",
		cjs: "JavaScript",
		jsx: "React",
		ts: "TypeScript",
		typescript: "TypeScript",
		tsx: "React",
		sh: "终端命令",
		bash: "终端命令",
		zsh: "终端命令",
		shell: "终端命令",
		console: "终端命令",
		html: "HTML",
		css: "样式",
		scss: "样式",
		sql: "SQL",
		json: "配置",
		yaml: "配置",
		yml: "配置",
		toml: "配置",
		go: "Go",
		rs: "Rust",
		rust: "Rust",
		java: "Java",
		swift: "Swift"
	}[k] || "" : {
		py: "Python",
		python: "Python",
		js: "JavaScript",
		javascript: "JavaScript",
		mjs: "JavaScript",
		cjs: "JavaScript",
		jsx: "React",
		ts: "TypeScript",
		typescript: "TypeScript",
		tsx: "TypeScript",
		sh: "shell",
		bash: "shell",
		zsh: "shell",
		shell: "shell",
		html: "HTML",
		css: "CSS",
		scss: "SCSS",
		sql: "SQL",
		json: "JSON",
		yaml: "YAML",
		yml: "YAML",
		toml: "TOML",
		go: "Go",
		rs: "Rust",
		rust: "Rust",
		java: "Java",
		swift: "Swift"
	}[k] || "";
}
function formatCodeFenceSpeechSummary(fenceState, docLang) {
	const lineCount = Math.max(0, Number(fenceState?.lineCount || 0));
	const langLabel = formatCodeFenceLangLabel(fenceState?.lang || "", docLang);
	if (docLang === "zh") {
		if (lineCount >= 4) return langLabel ? `这里附了一段代码，共${lineCount}行${langLabel}。` : `这里附了一段代码，共${lineCount}行。`;
		return "这里附了一段代码。";
	}
	if (lineCount >= 4) return langLabel ? `I've included a ${lineCount}-line ${langLabel} snippet below.` : `I've included a ${lineCount}-line code snippet below.`;
	return "I've included a short code snippet below.";
}
function parseUnifiedMarkdownForSpeech(rawMarkdown) {
	const docLang = detectSpeechLang(rawMarkdown);
	const lines = String(rawMarkdown || "").split(/\r?\n/);
	const blocks = [];
	let fenceState = null;
	let lastCodeLangLabel = null;
	let tableRows = [];
	let seenFirstParagraph = false;
	let justSawHeading = false;
	const flushTable = () => {
		if (!tableRows.length) return;
		const dataRows = tableRows.filter((r) => !/^\s*\|?\s*[-:| ]+\s*\|?\s*$/.test(r));
		const count = Math.max(1, dataRows.length - 1);
		blocks.push({
			type: "table_summary",
			text: docLang === "zh" ? `这里附了一张${count}行的对比表。` : `There is a ${count}-row comparison table here.`
		});
		tableRows = [];
	};
	const flushCodeFence = () => {
		if (!fenceState) return;
		const finished = fenceState;
		fenceState = null;
		const curLangLabel = formatCodeFenceLangLabel(finished.lang || "", docLang);
		if (lastCodeLangLabel === null || curLangLabel && curLangLabel !== lastCodeLangLabel) {
			blocks.push({
				type: "code_summary",
				text: formatCodeFenceSpeechSummary(finished, docLang)
			});
			lastCodeLangLabel = curLangLabel || "";
		}
	};
	for (const rawLine of lines) {
		const trimmed = rawLine.trim();
		if (fenceState) {
			if (new RegExp(`^\\${fenceState.char}{${fenceState.len},}\\s*$`).test(trimmed)) flushCodeFence();
			else if (trimmed) fenceState.lineCount += 1;
			continue;
		}
		const openFence = /^(`{3,}|~{3,})(.*)$/.exec(trimmed);
		if (openFence && !(openFence[1][0] === "`" && openFence[2].includes("`"))) {
			flushTable();
			const infoToken = openFence[2].trim().split(/\s+/)[0] || "";
			fenceState = {
				char: openFence[1][0],
				len: openFence[1].length,
				lang: infoToken,
				lineCount: 0
			};
			continue;
		}
		if (/^\|.*\|$/.test(trimmed)) {
			tableRows.push(trimmed);
			continue;
		}
		flushTable();
		if (!trimmed || /^---+$/.test(trimmed) || /^<details|^<\/details|^!\[/.test(trimmed)) continue;
		lastCodeLangLabel = null;
		const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
		if (headingMatch) {
			const cleaned = cleanInlineUnified(headingMatch[2], docLang).replace(/^[一二三四五六七八九十\d]+[、.．)\s]+/, "").trim();
			if (cleaned) {
				blocks.push({
					type: "heading",
					text: ensurePunctUnified(cleaned, docLang)
				});
				justSawHeading = true;
			}
			continue;
		}
		const listNumMatch = /^(\d+)\.\s+(.+)$/.exec(trimmed);
		let body = listNumMatch ? listNumMatch[2] : trimmed.replace(/^(?:[-*>•+]\s+)+/, "").replace(/^\[[ xX]\]\s+/, "");
		if (listNumMatch) {
			const n = Number(listNumMatch[1]);
			body = `${docLang === "zh" && hasCjk(body) ? n <= 9 ? `第${DIGIT_ZH[String(n)]}，` : `第${n}，` : `${EN_ORDINALS[n] || `Item ${n},`} `}${body}`;
		}
		const cleaned = cleanInlineUnified(body, docLang);
		if (!cleaned || cleaned.length < 2) continue;
		const isLead = !seenFirstParagraph;
		seenFirstParagraph = true;
		blocks.push({
			type: "paragraph",
			text: ensurePunctUnified(cleaned, docLang),
			isLead,
			afterHeading: justSawHeading,
			isTail: false
		});
		justSawHeading = false;
	}
	flushCodeFence();
	flushTable();
	for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].type === "paragraph") {
		blocks[i].isTail = true;
		break;
	}
	return {
		docLang,
		blocks
	};
}
function extractBilingualGrams(text) {
	const lower = String(text || "").toLowerCase();
	const grams = /* @__PURE__ */ new Set();
	const cjk = lower.replace(/[^\u4e00-\u9fa5]/g, "");
	for (let i = 0; i < cjk.length - 1; i++) grams.add(cjk.slice(i, i + 2));
	for (const w of lower.match(/[a-z0-9]{3,}/g) || []) {
		if (EN_STOPWORDS.has(w)) continue;
		const stem = w.replace(/(?:ing|ed|es|s)$/, "");
		if (stem.length >= 3) grams.add(stem);
	}
	return grams;
}
function estimateSpokenSeconds(text) {
	const s = String(text || "");
	const cjk = (s.match(CJK_GLOBAL_RE) || []).length;
	const enWords = (s.match(/[a-zA-Z0-9]+/g) || []).length;
	return cjk / 4.2 + enWords / 2.8;
}
function summarizeSpeechBlocksWithTextRank(blocks, docLang, { targetSeconds = 32 } = {}) {
	const sentences = [];
	blocks.forEach((b, blockIdx) => {
		if (b.type !== "paragraph") return;
		const rawParts = b.text.split(/(?<=[。！？])|(?<=[.!?])\s+(?=[A-Z\u4e00-\u9fa5])/).map((p) => p.trim()).filter(Boolean);
		const merged = [];
		for (let i = 0; i < rawParts.length; i++) if (estimateSpokenSeconds(rawParts[i]) < 1.8 && i + 1 < rawParts.length) rawParts[i + 1] = `${rawParts[i]}${hasCjk(rawParts[i]) ? "" : " "}${rawParts[i + 1]}`;
		else merged.push(rawParts[i]);
		merged.forEach((s, partIdx) => {
			const estSec = estimateSpokenSeconds(s);
			if (estSec < 1.5) return;
			let prior = 1;
			const isHeadline = Boolean(b.isLead && partIdx === 0);
			if (isHeadline) prior *= 2.4;
			if (b.isTail) prior *= 1.55;
			if (b.afterHeading && partIdx === 0) prior *= 1.25;
			if (/原因|结论|真相|总结|核心|关键|建议|破案|放心|不限|免费|查清楚|已经全部|彻底|也就是说|一句话|\b(?:root cause|fixed|resolved|good news|in short|that means|automatically|recovered)\b/i.test(s)) prior *= 1.5;
			sentences.push({
				idx: sentences.length,
				blockIdx,
				isHeadline,
				estSec,
				text: ensurePunctUnified(s, docLang),
				grams: extractBilingualGrams(s),
				prior
			});
		});
	});
	const stripOrd = (s) => String(s || "").replace(/^第[一二三四五六七八九十\d]+，\s*/, "").replace(/^(?:First|Second|Third|Fourth|Fifth|Item \d+),\s*/i, "").trim();
	const N = sentences.length;
	if (N <= 3) return sentences.map((s) => ensurePunctUnified(stripOrd(s.text), docLang));
	const weights = Array.from({ length: N }, () => new Float64Array(N));
	const rowSums = new Float64Array(N);
	for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
		const gi = sentences[i].grams;
		const gj = sentences[j].grams;
		if (!gi.size || !gj.size) continue;
		let ov = 0;
		for (const g of gi) if (gj.has(g)) ov++;
		if (ov > 0) {
			const sim = ov / (Math.log(gi.size + 1) + Math.log(gj.size + 1));
			weights[i][j] = sim;
			weights[j][i] = sim;
			rowSums[i] += sim;
			rowSums[j] += sim;
		}
	}
	const priorSum = sentences.reduce((acc, s) => acc + s.prior, 0) || 1;
	let scores = sentences.map((s) => s.prior / priorSum);
	const damping = .7;
	for (let iter = 0; iter < 15; iter++) {
		const next = new Float64Array(N);
		for (let i = 0; i < N; i++) {
			let incoming = 0;
			for (let j = 0; j < N; j++) if (i !== j && rowSums[j] > 0) incoming += weights[j][i] / rowSums[j] * scores[j];
			next[i] = .30000000000000004 * (sentences[i].prior / priorSum) + damping * incoming;
		}
		scores = next;
	}
	const ranked = sentences.map((s, i) => ({
		...s,
		score: scores[i]
	})).sort((a, b) => b.score - a.score);
	const chosen = [];
	let secTotal = 0;
	const headline = sentences.find((s) => s.isHeadline);
	if (headline) {
		chosen.push(headline);
		secTotal += headline.estSec;
	}
	for (const cand of ranked) {
		if (chosen.some((c) => c.idx === cand.idx)) continue;
		if (chosen.length >= 5) break;
		if (secTotal + cand.estSec > targetSeconds && chosen.length >= 3) continue;
		if (chosen.some((sel) => {
			let ov = 0;
			for (const g of cand.grams) if (sel.grams.has(g)) ov++;
			return cand.grams.size > 0 && ov / cand.grams.size > .56;
		})) continue;
		chosen.push(cand);
		secTotal += cand.estSec;
	}
	chosen.sort((a, b) => a.idx - b.idx);
	return chosen.map((c) => ensurePunctUnified(stripOrd(c.text), docLang));
}
function prepareSpeechScript(rawMarkdown) {
	const { docLang, blocks } = parseUnifiedMarkdownForSpeech(rawMarkdown);
	const joiner = docLang === "zh" ? "" : " ";
	const fullText = blocks.map((b) => b.text).join(joiner).trim();
	const fullSec = estimateSpokenSeconds(fullText);
	if (fullSec <= 36 || blocks.filter((b) => b.type === "paragraph").length <= 3) return {
		docLang,
		fullText,
		conciseText: fullText,
		hasDistinctSummary: false
	};
	const conciseText = summarizeSpeechBlocksWithTextRank(blocks, docLang, { targetSeconds: 32 }).join(joiner).trim() || fullText;
	const conciseSec = estimateSpokenSeconds(conciseText);
	const hasDistinctSummary = conciseText.length > 0 && conciseSec < fullSec * .82;
	return {
		docLang,
		fullText,
		conciseText: hasDistinctSummary ? conciseText : fullText,
		hasDistinctSummary
	};
}
function pickBestBrowserVoice(voices, docLang = "zh") {
	if (!Array.isArray(voices) || voices.length === 0) return null;
	if (docLang === "en") {
		const enVoices = voices.filter((v) => /^en/i.test(v.lang || ""));
		if (!enVoices.length) return null;
		return enVoices.sort((a, b) => {
			const score = (v) => {
				const n = `${v.name || ""} ${v.voiceURI || ""}`.toLowerCase();
				let s = /^en[-_]?us/i.test(v.lang || "") ? 50 : 25;
				if (/natural|neural|online|premium|enhanced|siri|ava|allison|aria|jenny|samantha/i.test(n)) s += 45;
				if (v.localService) s += 5;
				return s;
			};
			return score(b) - score(a);
		})[0];
	}
	const zhVoices = voices.filter((v) => /^zh|^cmn/i.test(v.lang || ""));
	if (!zhVoices.length) return null;
	return zhVoices.sort((a, b) => {
		const score = (v) => {
			const n = `${v.name || ""} ${v.voiceURI || ""}`.toLowerCase();
			let s = /zh[-_]?cn|cmn[-_]?hans/i.test(v.lang || "") ? 50 : 20;
			if (/natural|neural|online|premium|enhanced|siri|xiaoxiao|yunxi|li-mu|yu-shu/i.test(n)) s += 45;
			if (/shelley|flo|sandy|reed|eddy/i.test(n)) s += 18;
			if (v.localService) s += 5;
			return s;
		};
		return score(b) - score(a);
	})[0];
}
function subdivideLongSpeechSentence(part, maxSec, maxChars) {
	const s = String(part || "").trim();
	if (!s) return [];
	if (estimateSpokenSeconds(s) <= maxSec && s.length <= maxChars) return [s];
	const semiParts = s.split(/(?<=[；;：:])\s*/).filter(Boolean);
	const stage1 = semiParts.length > 1 ? semiParts : [s];
	const out = [];
	for (const item of stage1) {
		if (estimateSpokenSeconds(item) <= maxSec && item.length <= maxChars) {
			out.push(item);
			continue;
		}
		const commaParts = item.split(/(?<=[，,、])\s*/).filter(Boolean);
		let cur = "";
		for (const cp of commaParts) {
			const candidate = cur ? `${cur} ${cp}`.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2") : cp;
			if (cur && (estimateSpokenSeconds(candidate) > maxSec || candidate.length > maxChars)) {
				out.push(cur.trim());
				cur = cp;
			} else cur = candidate;
		}
		if (cur.trim()) out.push(cur.trim());
	}
	return out.length ? out : [s];
}
function splitIntoContinuousBrowserChunks(text, isAppleWebKit = false) {
	const clean = String(text || "").trim();
	if (!clean) return [];
	const langSwitches = (clean.match(/[\u4e00-\u9fa5]\s*[A-Za-z]|[A-Za-z]\s*[\u4e00-\u9fa5]/g) || []).length;
	if (isAppleWebKit && clean.length <= 520 && langSwitches < 10) return [clean];
	if (!isAppleWebKit && estimateSpokenSeconds(clean) <= 11 && clean.length <= 160) return [clean];
	const maxSec = isAppleWebKit ? 30 : 11;
	const maxChars = isAppleWebKit ? 200 : 160;
	const rawSentences = clean.split(/(?<=[。！？.!?\n])\s*/).filter(Boolean);
	const parts = [];
	for (const rs of rawSentences) parts.push(...subdivideLongSpeechSentence(rs, maxSec, maxChars));
	const chunks = [];
	let buf = "";
	for (const p of parts) {
		const candidate = buf ? `${buf} ${p}`.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2") : p;
		if (buf && (estimateSpokenSeconds(candidate) > maxSec || candidate.length > maxChars)) {
			chunks.push(buf.trim());
			buf = p;
		} else buf = candidate;
	}
	if (buf.trim()) chunks.push(buf.trim());
	return chunks.length ? chunks : [clean];
}
function snapToCleanSpeechOffset(fullText, rawOffset) {
	const text = String(fullText || "");
	if (!text) return 0;
	let idx = Math.max(0, Math.min(Math.floor(Number(rawOffset) || 0), text.length));
	if (idx <= 0) return 0;
	if (idx >= text.length) return text.length;
	while (idx > 0 && /[A-Za-z0-9]/.test(text[idx - 1]) && /[A-Za-z0-9]/.test(text[idx])) idx -= 1;
	while (idx < text.length && /^[，。！？；：、,.!?;:\s]/.test(text[idx])) idx += 1;
	return idx;
}
function computeSpeechResumeOffset({ fullText = "", docLang = "zh", segmentBaseOffset = 0, segmentStartedAt = 0, segmentRate = 1, boundaryCharOffset = -1, boundaryUpdatedAt = 0, nowMs = Date.now() } = {}) {
	const text = String(fullText || "");
	if (!text) return 0;
	const rate = Number(segmentRate) > 0 ? Number(segmentRate) : 1;
	const charsPerSec = (docLang === "en" ? 14.2 : 4.2) * rate;
	let estimatedOffset = Number(segmentBaseOffset) || 0;
	if (boundaryCharOffset >= 0 && boundaryUpdatedAt > 0) {
		const driftSec = Math.max(0, (nowMs - boundaryUpdatedAt) / 1e3);
		estimatedOffset = boundaryCharOffset + (driftSec > .9 ? Math.floor((driftSec - .4) * charsPerSec) : 0);
	} else if (segmentStartedAt > 0) {
		const elapsedSec = Math.max(0, (nowMs - segmentStartedAt - 120) / 1e3);
		const lookbackCushion = docLang === "en" ? 6 : 2;
		const rawDelta = Math.floor(elapsedSec * charsPerSec);
		estimatedOffset = (Number(segmentBaseOffset) || 0) + (rawDelta > lookbackCushion ? rawDelta - lookbackCushion : rawDelta);
	}
	const maxSafe = Math.max(0, text.length - (docLang === "en" ? 5 : 2));
	return snapToCleanSpeechOffset(text, Math.min(estimatedOffset, maxSafe));
}
// hub/web/src/utils/session-labels.js
function escapeAttr(str) {
	return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderHarnessBadgeHtml(harness = "dsh", variant = "row", titleText = "") {
	const symId = harness === "antigravity-ide" ? "dsh-icon-ide" : harness === "workbuddy" ? "dsh-icon-workbuddy" : harness === "codex" ? "dsh-icon-codex" : harness === "claude" ? "dsh-icon-claude" : harness === "doubao" ? "dsh-icon-doubao" : "dsh-icon-dsh";
	const titleAttr = titleText ? ` title="${escapeAttr(titleText)}"` : "";
	return `<span class="harness-icon-badge ${escapeAttr(variant)}"${titleAttr}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="#${symId}"/></svg></span>`;
}
function stripRedundantProjectPrefix(rawTitle, rawProject) {
	const title = String(rawTitle || "").trim();
	const project = String(rawProject || "").trim();
	if (!title || !project) return title;
	const prefix = `${project} / `;
	if (title.startsWith(prefix)) return title.slice(prefix.length).trim() || title;
	return title;
}
function formatCompactProjectLabel(rawProject, nowDate = /* @__PURE__ */ new Date()) {
	const raw = String(rawProject || "").trim();
	if (!raw) return "默认工作区";
	const m = /^(\d{4})[-_](\d{1,2})[-_](\d{1,2})(?:[-_T](\d{1,2})[-_:](\d{2})(?:[-_:](\d{2}))?)?$/.exec(raw);
	if (m) {
		const y = Number(m[1]);
		const mo = Number(m[2]);
		const d = Number(m[3]);
		if (y >= 2020 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
			const isSameYear = nowDate.getFullYear() === y;
			const isSameDay = isSameYear && nowDate.getMonth() + 1 === mo && nowDate.getDate() === d;
			const hasTime = m[4] != null && m[5] != null;
			const mmdd = `${String(mo).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
			if (isSameDay && hasTime) return `${Number(m[4])}:${String(m[5]).padStart(2, "0")}`;
			const hhmmPadded = hasTime ? `${String(Number(m[4])).padStart(2, "0")}:${String(m[5]).padStart(2, "0")}` : "";
			if (isSameYear) return hasTime ? `${mmdd} ${hhmmPadded}` : mmdd;
			return hasTime ? `${y}/${mmdd} ${hhmmPadded}` : `${y}/${mmdd}`;
		}
	}
	return raw;
}
function normalizeDeviceModelShort(rawModel, { compact = false } = {}) {
	const clean = String(rawModel || "").trim();
	if (!clean) return "";
	if (/^macbook[\s-]*air\b/i.test(clean)) return "Air";
	if (/^macbook[\s-]*pro\b/i.test(clean)) return "MBP";
	if (/^mac[\s-]*mini\b/i.test(clean)) return compact ? "Mini" : "Mac mini";
	if (/^mac[\s-]*studio\b/i.test(clean)) return "Studio";
	if (/^mac[\s-]*pro\b/i.test(clean)) return compact ? "Pro" : "Mac Pro";
	if (/^imac\b/i.test(clean)) return "iMac";
	return clean;
}
function buildShortHostNameMap(hosts = []) {
	const parsed = (hosts || []).map((h) => {
		const raw = String(h?.hostName || h?.hostId || "").trim().replace(/\.(local|lan)$/i, "");
		let owner = "";
		let device = raw;
		const zhSplit = /^(.+?)的\s*(.+)$/.exec(raw);
		const enSplit = !zhSplit ? /^(.+?)(?:'s|’s)\s+(.+)$/i.exec(raw) : null;
		if (zhSplit) {
			owner = zhSplit[1].trim();
			device = zhSplit[2].trim();
		} else if (enSplit) {
			owner = enSplit[1].trim();
			device = enSplit[2].trim();
		} else {
			const slugMac = /^([a-z0-9_-]+?)(?:-|de)(MacBook[- ]?Air|MacBook[- ]?Pro|Mac[- ]?mini|Mac[- ]?Studio|iMac|Mac[- ]?Pro)$/i.exec(raw);
			if (slugMac) {
				owner = slugMac[1].trim();
				device = slugMac[2].replace(/-/g, " ").trim();
			}
		}
		let shortBase = "";
		let compactBase = "";
		if (/^(电脑|pc|computer|laptop|host)$/i.test(device) && owner) {
			shortBase = owner;
			compactBase = owner;
		} else {
			shortBase = normalizeDeviceModelShort(device, { compact: false }) || raw;
			compactBase = normalizeDeviceModelShort(device, { compact: true }) || shortBase;
		}
		return {
			hostId: h?.hostId || raw,
			raw,
			owner,
			shortBase,
			compactBase
		};
	});
	const baseCounts = {};
	for (const item of parsed) baseCounts[item.compactBase] = (baseCounts[item.compactBase] || 0) + 1;
	const provisional = parsed.map((item) => {
		if (baseCounts[item.compactBase] > 1 && item.owner) {
			const cleanOwner = item.owner.length > 6 ? item.owner.slice(0, 6) : item.owner;
			return {
				...item,
				label: `${cleanOwner}·${item.compactBase}`
			};
		}
		return {
			...item,
			label: item.shortBase
		};
	});
	const labelCounts = {};
	for (const item of provisional) labelCounts[item.label] = (labelCounts[item.label] || 0) + 1;
	const map = {};
	for (const item of provisional) if (labelCounts[item.label] > 1 && item.owner.length > 6) {
		const tailOwner = `${item.owner.slice(0, 4)}…${item.owner.slice(-1)}`;
		map[item.hostId] = `${tailOwner}·${item.compactBase}`;
	} else map[item.hostId] = item.label;
	return map;
}
/**
* Compute session list sort priority:
* 1. Pinned (`pinned: true`) always stays fixed at the very top of the list (10 + base state priority)
* 2. Needs Approval / Choice (`status === 'approval'`) -> 4
* 3. Unread Conclusion / Unread Interrupted (`hasUnreadConclusion || isUnreadInterrupted`) -> 3
* 4. Actively Running / Queued (`status === 'running' || queuedCount > 0`) -> 2
* 5. Read / Idle historical conversations -> 0 (sorted by `updatedAt` desc)
*/
function computeSessionSortPriority(s) {
	if (!s) return 0;
	let base = 0;
	if (s.status === "approval") base = 4;
	else if (s.hasUnreadConclusion || s.isUnreadInterrupted) base = 3;
	else if (s.status === "running" || (Number(s.queuedCount) || 0) > 0) base = 2;
	return s.pinned ? 10 + base : base;
}
function sortNormalizedSessions(list = []) {
	return [...list].sort((a, b) => {
		const pa = computeSessionSortPriority(a);
		const pb = computeSessionSortPriority(b);
		if (pa !== pb) return pb - pa;
		return (b.updatedAt || 0) - (a.updatedAt || 0);
	});
}
var HARNESS_CAPABILITY_MATRIX = [
	{
		id: "dsh",
		label: "DSH",
		canView: true,
		canPrompt: true,
		canStop: true,
		approveState: "supported",
		canSteer: true
	},
	{
		id: "antigravity-ide",
		label: "Antigravity IDE",
		canView: true,
		canPrompt: true,
		canStop: true,
		approveState: "supported",
		canSteer: true
	},
	{
		id: "codex",
		label: "Codex",
		canView: true,
		canPrompt: true,
		canStop: true,
		approveState: "supported",
		canSteer: true
	},
	{
		id: "workbuddy",
		label: "WorkBuddy",
		canView: true,
		canPrompt: true,
		canStop: true,
		approveState: "supported",
		canSteer: true
	},
	{
		id: "claude",
		label: "Claude Code",
		canView: true,
		canPrompt: true,
		canStop: true,
		approveState: "planned",
		canSteer: false
	},
	{
		id: "doubao",
		label: "豆包电脑版",
		canView: true,
		canPrompt: false,
		canStop: false,
		approveState: "unsupported",
		canSteer: false
	}
];
function renderCapabilityMatrixRowsHtml(rows = HARNESS_CAPABILITY_MATRIX) {
	return rows.map((row, idx) => {
		const borderStyle = idx < rows.length - 1 ? " style=\"border-bottom:1px solid var(--hairline);\"" : "";
		const viewCell = row.canView ? "<td>✅</td>" : "<td style=\"color:var(--muted);\">—</td>";
		const promptCell = row.canPrompt ? "<td>✅</td>" : "<td style=\"color:var(--muted);\">—</td>";
		const stopCell = row.canStop ? "<td>✅</td>" : "<td style=\"color:var(--muted);\">—</td>";
		const approveCell = row.approveState === "supported" ? "<td>✅</td>" : row.approveState === "planned" ? "<td style=\"color:var(--muted);\">计划中</td>" : "<td style=\"color:var(--muted);\">—</td>";
		const steerCell = row.canSteer ? "<td>✅</td>" : "<td style=\"color:var(--muted);\">—</td>";
		return `<tr${borderStyle}>
                    <td style="text-align:left;padding:7px 4px;font-weight:700;"><span style="display:inline-flex;align-items:center;gap:6px;">${renderHarnessBadgeHtml(row.id, "inline")}<span>${escapeAttr(row.label)}</span></span></td>
                    ${viewCell}${promptCell}${stopCell}${approveCell}${steerCell}
                  </tr>`;
	}).join("\n");
}
// hub/web/src/triage-deck.js
function esc(s) {
	return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var REST_X = 5;
var REST_Y = 2;
var REST_SCALE = .984;
var REST_ROT = 1.25;
var GRACE_UNDO_MS = 2e3;
var HIGH_RISK_RE = /(?:--drop-[a-z0-9_-]*|--accept-data-loss\b|\b(?:rm\s+-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\b|rm\s+--recursive\b|git\s+push\b[^\n]*(?:\s-f\b|--force\b|--tags\b)|git\s+reset\s+--hard\b|git\s+clean\s+-[a-zA-Z]*f|DROP\s+(?:TABLE|DATABASE|SCHEMA)\b|TRUNCATE\s+TABLE\b|kubectl\s+delete\b|terraform\s+destroy\b|gcloud\s+[^\n]*\bdelete\b|npm\s+publish\b|docker\s+push\b|mkfs\b|dd\s+if=|sudo\s+))/i;
var DANGER_TOKEN_RE = /(\brm\s+-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\b|--force-with-lease\b|--force\b|\s-f\b|--hard\b|--drop-[a-z0-9_-]*|--accept-data-loss\b|\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b|\bTRUNCATE\s+TABLE\b|\bnpm\s+publish\b|\bdocker\s+push\b|\bkubectl\s+delete\b|\bterraform\s+destroy\b|\bsudo\b)/gi;
function isTriageEligibleSession(s) {
	if (!s) return false;
	if (s.status === "running") return false;
	if (s.status === "approval") {
		if (s.approvalObj?.settling) return false;
		return true;
	}
	return Boolean(s.hasUnreadConclusion || s.isUnreadInterrupted);
}
function isHighRiskCommand(commandLine = "", reason = "") {
	const combined = `${String(commandLine || "")}\n${String(reason || "")}`;
	return HIGH_RISK_RE.test(combined);
}
function highlightDangerousCommandHtml(rawCmd = "") {
	return esc(String(rawCmd || "")).replace(DANGER_TOKEN_RE, "<span class=\"dsh-triage-hl-danger\">$1</span>");
}
function extractLastUserPromptAndMedia(transcript = [], lang = "zh") {
	const en = lang === "en";
	const list = Array.isArray(transcript) ? transcript : [];
	for (let i = list.length - 1; i >= 0; i -= 1) {
		const m = list[i];
		if (!m || m.role !== "user") continue;
		let raw = String(m.text || "").trim();
		if (!raw) continue;
		const reqMatch = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(raw);
		if (reqMatch) raw = reqMatch[1].trim();
		else raw = raw.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, "").trim();
		const mediaPaths = [];
		const addPath = (p) => {
			const clean = String(p || "").replace(/^file:\/\//i, "").trim();
			if (clean && !mediaPaths.includes(clean)) mediaPaths.push(clean);
		};
		raw = raw.replace(/\[手机端上传图片附件\s*\(\d+\s*张\)[^\]]*\]:?([\s\S]*)$/i, (_full, tail) => {
			const lines = String(tail || "").split("\n");
			for (const ln of lines) {
				const pathMatch = /:\s*(\/[^\s()]+?\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))/i.exec(ln);
				if (pathMatch?.[1]) addPath(pathMatch[1]);
			}
			return "";
		});
		let optimisticImgCount = 0;
		raw = raw.replace(/\[🖼️\s*已附带\s*(\d+)\s*张截图\]/g, (_m, n) => {
			optimisticImgCount += Number(n) || 1;
			return "";
		});
		for (const med of [...Array.isArray(m.media) ? m.media : [], ...Array.isArray(m.images) ? m.images : []]) if (typeof med === "string") addPath(med);
		else if (med?.uri || med?.path) addPath(med.uri || med.path);
		const cleanText = raw.replace(/\n{3,}/g, "\n\n").trim();
		const imageCount = Math.max(mediaPaths.length, optimisticImgCount);
		if (cleanText || imageCount > 0) return {
			text: cleanText || (en ? "(Image attached)" : "（发送了图片附件）"),
			mediaPaths,
			imageCount
		};
	}
	return {
		text: "",
		mediaPaths: [],
		imageCount: 0
	};
}
function extractSessionChangedFiles(s) {
	if (!s) return {
		files: [],
		hasLineCounts: false,
		totalAdd: 0,
		totalDel: 0
	};
	if (Array.isArray(s.changedFiles) && s.changedFiles.length > 0) {
		let anyExplicitCount = false;
		const files = s.changedFiles.map((fc) => {
			if (typeof fc === "string") return {
				name: fc.split("/").slice(-2).join("/") || fc,
				path: fc,
				added: 0,
				removed: 0
			};
			const rawAdd = fc?.additions ?? fc?.added ?? fc?.linesAdded;
			const rawDel = fc?.deletions ?? fc?.removed ?? fc?.linesRemoved;
			const addNum = Number(rawAdd) || 0;
			const delNum = Number(rawDel) || 0;
			if (addNum > 0 || delNum > 0) anyExplicitCount = true;
			const rawPath = fc?.path || fc?.name || "";
			const fallbackName = rawPath ? rawPath.split("/").slice(-2).join("/") : "file";
			return {
				name: fc?.displayPath || fc?.name || fallbackName || "file",
				path: rawPath,
				added: addNum,
				removed: delNum
			};
		});
		const totalAdd = files.reduce((acc, f) => acc + f.added, 0);
		const totalDel = files.reduce((acc, f) => acc + f.removed, 0);
		return {
			files,
			hasLineCounts: anyExplicitCount,
			totalAdd,
			totalDel
		};
	}
	const seen = /* @__PURE__ */ new Map();
	const tr = Array.isArray(s.transcript) ? s.transcript : [];
	for (const m of tr) {
		if (!m || m.role !== "assistant") continue;
		const tools = Array.isArray(m.toolCalls) && m.toolCalls.length > 0 ? m.toolCalls : m.tools || [];
		for (const t of tools) {
			if (!t || typeof t !== "object") continue;
			const tName = String(t.name || "");
			if (!/^(?:write_file|edit_file|Write|Edit|MultiEdit|NotebookEdit|replace_in_file|create_file)$/i.test(tName)) continue;
			const rawPath = String(t.filePath || t.path || t.targetFile || "").trim();
			if (!rawPath && t.summary) {
				const mPath = /([a-zA-Z0-9_.\-/]+\.[a-zA-Z0-9]{1,8})/.exec(String(t.summary));
				if (mPath?.[1]) seen.set(mPath[1], {
					name: mPath[1],
					path: mPath[1],
					added: 0,
					removed: 0
				});
			} else if (rawPath) {
				const shortName = rawPath.split("/").slice(-2).join("/");
				seen.set(rawPath, {
					name: shortName || rawPath,
					path: rawPath,
					added: 0,
					removed: 0
				});
			}
		}
	}
	return {
		files: [...seen.values()],
		hasLineCounts: false,
		totalAdd: 0,
		totalDel: 0
	};
}
function localizeApprovalOptionLabel(rawLabel = "", idx = 1, lang = "zh") {
	const en = lang === "en";
	const s = String(rawLabel || "").trim();
	if (!s) return en ? `${idx}. Allow this time` : `${idx}. 允许执行`;
	const clean = s.replace(/^\d+\.\s*/, "");
	let m = /^(?:Yes,\s*allow\s+this\s+time|本次允许执行|允许执行)$/i.exec(clean);
	if (m) return en ? `${idx}. Allow this time` : `${idx}. 本次允许执行`;
	m = /^(?:Yes,\s*and\s+always\s+allow\s+'([^']+)'\s+in\s+this\s+conversation|本对话内始终允许\s*'([^']+)')$/i.exec(clean);
	if (m) {
		const target = m[1] || m[2];
		return en ? `${idx}. Always allow '${target}' in this chat` : `${idx}. 本对话内始终允许 '${target}'`;
	}
	m = /^(?:Yes,\s*and\s+always\s+allow\s+in\s+this\s+conversation|本对话内始终允许)$/i.exec(clean);
	if (m) return en ? `${idx}. Always allow in this chat` : `${idx}. 本对话内始终允许`;
	m = /^(?:Yes,\s*and\s+always\s+allow\s+'([^']+)'|始终允许\s*'([^']+)')$/i.exec(clean);
	if (m) {
		const target = m[1] || m[2];
		return en ? `${idx}. Always allow '${target}'` : `${idx}. 始终允许 '${target}'`;
	}
	m = /^(?:Yes,\s*and\s+always\s+allow|始终允许该操作)$/i.exec(clean);
	if (m) return en ? `${idx}. Always allow` : `${idx}. 始终允许该操作`;
	return /^\d+\./.test(s) ? s : `${idx}. ${s}`;
}
function shortenButtonOptionText(label = "", lang = "zh") {
	const en = lang === "en";
	const clean = String(label || "").replace(/^[0-9A-Za-z]+\.\s*/, "").replace(/（推荐）|\(Recommended\)/gi, "").trim();
	const maxLen = en ? 18 : 13;
	return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean || (en ? "Confirm" : "确认");
}
function extractPlainSummaryFromMarkdown(md = "", lang = "zh") {
	return String(md || "").replace(/```[\s\S]*?```/g, lang === "en" ? " [code] " : " [代码块] ").replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/[*_`>~]/g, "").replace(/\n{2,}/g, "\n").trim();
}
function buildTriageCardViewModel(s, shortHostMap = {}, lang = "zh") {
	const en = lang === "en";
	const fallbackHost = en ? "Computer" : "电脑";
	const fallbackTitle = en ? "Untitled Session" : "未命名会话";
	const hostShort = shortHostMap[s.hostId] || s.hostName || s.hostId || fallbackHost;
	const projShort = formatCompactProjectLabel(s.project || "");
	const cleanTitle = stripRedundantProjectPrefix(s.title || fallbackTitle, s.project || "") || fallbackTitle;
	const promptInfo = extractLastUserPromptAndMedia(s.transcript, lang);
	const diffInfo = extractSessionChangedFiles(s);
	const canSendPrompt = s.controlMode !== "observe-only" && s.capabilities?.canSendPrompt !== false;
	const tr = Array.isArray(s.transcript) ? s.transcript : [];
	let latestAssistantMsg = null;
	for (let i = tr.length - 1; i >= 0; i -= 1) if (tr[i]?.role === "assistant" && String(tr[i]?.text || "").trim()) {
		latestAssistantMsg = tr[i];
		break;
	}
	const app = s.approvalObj;
	if (Boolean(s.status === "approval" && app && (app.kind === "question" || Array.isArray(app.questions)))) {
		const defaultQText = en ? "Please select an option to continue" : "请做出选择以继续";
		const questions = Array.isArray(app.questions) && app.questions.length > 0 ? app.questions : [{
			id: "q_1",
			question: app.promptTitle || defaultQText,
			options: []
		}];
		const primaryQ = questions[0];
		const qId = String(primaryQ.id || "q_1");
		const rawOpts = Array.isArray(primaryQ.options) ? primaryQ.options : [];
		const alpha = "ABCDEFGH";
		const options = rawOpts.map((o, idx) => {
			const rawLbl = String(o?.label || o || (en ? `Option ${idx + 1}` : `选项 ${idx + 1}`));
			return {
				value: rawLbl,
				label: /^[0-9A-Z]+\.\s/.test(rawLbl) ? rawLbl : `${alpha[idx] || idx + 1}. ${rawLbl}`,
				shortBtn: shortenButtonOptionText(rawLbl, lang),
				desc: o?.description ? String(o.description) : ""
			};
		});
		const extraCount = questions.length > 1 ? en ? ` (${questions.length} questions)` : `（共 ${questions.length} 个问题）` : "";
		return {
			cardKey: `q:${s.id}:${app.code || ""}`,
			sessionId: s.id,
			hostId: s.hostId,
			harness: s.harness,
			title: cleanTitle,
			sub: `${hostShort} · ${projShort} · ${en ? "Needs Input" : "待你选择"}`,
			promptInfo,
			diffInfo,
			kind: "question",
			risk: "normal",
			code: app.code || "",
			qId,
			questions,
			multi: Boolean(primaryQ.multiSelect),
			headline: `${primaryQ.question || app.promptTitle || defaultQText}${extraCount}`,
			cmdLine: "",
			cmdReason: "",
			replyPreview: "",
			fullReplyMarkdown: latestAssistantMsg?.text || "",
			options,
			canCustom: true,
			customLabel: en ? "Other plan / Add note…" : "其他方案 / 补充说明…"
		};
	}
	if (s.status === "approval" && app) {
		const cmdLine = String(app.commandLine || app.reason || "").trim();
		const defaultReason = en ? `Requesting ${app.toolName || "tool"}` : `请求调用 ${app.toolName || "工具"}`;
		const cmdReason = String(app.subtitle || app.promptTitle || defaultReason).trim();
		const risk = isHighRiskCommand(cmdLine, cmdReason) ? "high" : "normal";
		const rawOpts = Array.isArray(app.options) && app.options.length > 0 ? app.options : [{
			index: 1,
			label: en ? "Yes, allow this time" : "1. 本次允许执行"
		}, {
			index: 4,
			label: en ? "Skip & tell AI what to do instead…" : "不执行，告诉 AI 改怎么做…"
		}];
		const positiveOpts = [];
		let denyOptIndex = 4;
		rawOpts.forEach((rawOpt, idx) => {
			const optObj = typeof rawOpt === "string" ? {
				index: idx + 1,
				label: rawOpt
			} : rawOpt;
			const optIdx = Number(optObj.index) || idx + 1;
			const lbl = String(optObj.label || "");
			if (optIdx === 4 || /^(?:no\b|skip\b|deny\b|reject\b|拒绝|不执行|取消)/i.test(lbl)) denyOptIndex = optIdx;
			else {
				const localized = localizeApprovalOptionLabel(lbl, positiveOpts.length + 1, lang);
				positiveOpts.push({
					optionIndex: optIdx,
					label: localized,
					shortBtn: shortenButtonOptionText(localized, lang),
					desc: ""
				});
			}
		});
		if (positiveOpts.length === 0) positiveOpts.push({
			optionIndex: 1,
			label: en ? "1. Allow this time" : "1. 本次允许执行",
			shortBtn: en ? "Allow this time" : "本次允许执行",
			desc: ""
		});
		const rawLead = latestAssistantMsg?.text ? extractPlainSummaryFromMarkdown(latestAssistantMsg.text, lang).split("\n")[0] || "" : "";
		const leadLimit = en ? 108 : 68;
		const headline = (rawLead.length > leadLimit ? `${rawLead.slice(0, leadLimit - 1)}…` : rawLead) || app.promptTitle || (en ? `Waiting for tool approval: ${app.toolName || "command"}` : `等待确认工具调用：${app.toolName || "命令"}`);
		return {
			cardKey: `app:${s.id}:${app.code || ""}`,
			sessionId: s.id,
			hostId: s.hostId,
			harness: s.harness,
			title: cleanTitle,
			sub: `${hostShort} · ${projShort} · ${risk === "high" ? en ? "High-Risk Approval" : "高危授权" : en ? "Tool Approval" : "命令授权"}`,
			promptInfo,
			diffInfo,
			kind: "approval",
			risk,
			code: app.code || "",
			multi: false,
			headline,
			cmdLine,
			cmdReason: risk === "high" ? en ? `⚠️ High-Risk Guard · ${cmdReason}` : `⚠️ 高危操作拦截 · ${cmdReason}` : `🔧 ${cmdReason}`,
			replyPreview: "",
			fullReplyMarkdown: latestAssistantMsg?.text || "",
			options: positiveOpts,
			denyOptionIndex: denyOptIndex,
			canCustom: canSendPrompt,
			customLabel: en ? `${positiveOpts.length + 1}. Skip & tell AI what to do instead…` : `${positiveOpts.length + 1}. 不执行，告诉 AI 改怎么做…`
		};
	}
	const isInterrupted = Boolean(s.isUnreadInterrupted);
	const fullMd = latestAssistantMsg?.text || s.rawLastPreview || s.lastPreview || "";
	const plainBody = extractPlainSummaryFromMarkdown(fullMd, lang);
	const lines = plainBody.split("\n").map((l) => l.trim()).filter(Boolean);
	const headLimit = en ? 88 : 56;
	const clipHead = (txt) => {
		const t = String(txt || "").trim();
		return t.length > headLimit ? `${t.slice(0, headLimit - 1)}…` : t;
	};
	const headline = isInterrupted ? en ? `⚠️ Interrupted: ${clipHead(lines[0] || s.lastPreview || "View details")}` : `⚠️ 任务异常中断：${clipHead(lines[0] || s.lastPreview || "请查看详情")}` : en ? `✅ Ready to review: ${clipHead(lines[0] || cleanTitle)}` : `✅ 已完工待阅：${clipHead(lines[0] || cleanTitle)}`;
	const replyPreview = lines.slice(1, 4).join(" ") || plainBody.slice(0, 140);
	return {
		cardKey: `conc:${s.id}:${s.conclusionSig || s.updatedAt || ""}`,
		sessionId: s.id,
		hostId: s.hostId,
		harness: s.harness,
		title: cleanTitle,
		sub: `${hostShort} · ${projShort} · ${isInterrupted ? en ? "Interrupted" : "异常中断" : en ? "Completed" : "已出结论"}`,
		promptInfo,
		diffInfo,
		kind: isInterrupted ? "interrupted" : "conclusion",
		risk: "normal",
		code: "",
		multi: false,
		headline,
		cmdLine: "",
		cmdReason: "",
		replyPreview,
		fullReplyMarkdown: fullMd,
		artifacts: Array.isArray(s.artifacts) ? s.artifacts : [],
		options: [{
			optionIndex: 1,
			label: en ? "1. Mark as Read & Archive" : "1. 已阅归档（消除未读蓝点）",
			shortBtn: en ? "Mark as Read" : "标为已阅归档",
			desc: ""
		}],
		canCustom: canSendPrompt,
		customLabel: en ? "2. Follow up / Request changes…" : "2. 继续追问 / 交代修改意见…"
	};
}
function createTriageDeckController(deps) {
	let isOpen = false;
	const cardDrafts = /* @__PURE__ */ new Map();
	let snoozeSeq = 1;
	const snoozeOrder = /* @__PURE__ */ new Map();
	const dismissedKeys = /* @__PURE__ */ new Map();
	const undoStack = [];
	let graceCountdownTimer = null;
	let dragging = false;
	let btnPressMoved = false;
	let sx = 0;
	let sy = 0;
	let dx = 0;
	let dy = 0;
	let maxDx = 0;
	let dragStartAt = 0;
	let startedInDock = false;
	let startedOnConfirmBtn = false;
	let axisLocked = "";
	let holdTimer = null;
	let holdPct = 0;
	let rightDragHoldTimer = null;
	let rightDragUnlocked = false;
	let lpTimer = null;
	let isLongPress = false;
	let isRecording = false;
	let speechRec = null;
	let listenersBound = false;
	let modalSheetBound = false;
	let activeModalKind = "";
	let activeModalSessionId = "";
	let modalExpanded = false;
	let lastModalRenderedLen = -1;
	let lastRenderedSig = "";
	function appendMediaAuthUrl(url) {
		const mt = deps.getMediaTicket?.() || "";
		if (!mt || !url) return url;
		return `${url}${url.includes("?") ? "&" : "?"}mt=${encodeURIComponent(mt)}`;
	}
	function buildLocalThumbSrc(hostId, filePath) {
		if (!hostId || !filePath) return "";
		const qp = new URLSearchParams({
			path: filePath,
			thumb: "1"
		});
		return appendMediaAuthUrl(`/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${qp.toString()}`);
	}
	function flushAllGraceCommits() {
		for (const item of undoStack) if (item.type === "grace" && item.graceTimer) {
			clearTimeout(item.graceTimer);
			item.graceTimer = null;
			item.flushed = true;
			item.commitFn?.();
		}
		clearInterval(graceCountdownTimer);
		graceCountdownTimer = null;
	}
	const curLang = () => deps.getLang?.() === "en" ? "en" : "zh";
	const isEn = () => curLang() === "en";
	function syncStaticChromeLang() {
		const en = isEn();
		const overlay = document.getElementById("triageDeckOverlay");
		if (overlay) overlay.setAttribute("aria-label", en ? "Swipe Triage Mode" : "滑卡批阅模式");
		const titleSpan = document.getElementById("triageCenterTitleText");
		if (titleSpan) titleSpan.textContent = en ? "Swipe Triage" : "滑卡批阅";
		const backBtn = document.getElementById("triageBackToListBtn");
		if (backBtn) backBtn.textContent = en ? "☰ List View" : "☰ 列表模式";
		const closeBtn = document.getElementById("triageModalCloseBtn");
		if (closeBtn) closeBtn.textContent = en ? "Close ✕" : "收起 ✕";
		const expBtn = document.getElementById("triageModalExpandBtn");
		if (expBtn) expBtn.textContent = modalExpanded ? en ? "⤡ Half" : "⤡ 半屏" : en ? "⤢ Full" : "⤢ 全屏";
	}
	function getOrderedActiveCards() {
		const now = Date.now();
		for (const [k, expAt] of dismissedKeys.entries()) if (now > expAt) dismissedKeys.delete(k);
		const lang = curLang();
		const allSessions = deps.getSessions?.() || [];
		const shortHostMap = deps.getShortHostMap?.() || {};
		const eligible = allSessions.filter(isTriageEligibleSession);
		const models = [];
		for (const s of eligible) {
			const vm = buildTriageCardViewModel(s, shortHostMap, lang);
			if (dismissedKeys.has(vm.cardKey)) continue;
			models.push({
				session: s,
				vm
			});
		}
		models.sort((a, b) => {
			const sa = snoozeOrder.get(a.vm.cardKey) || 0;
			const sb = snoozeOrder.get(b.vm.cardKey) || 0;
			if (sa !== sb) return sa - sb;
			return 0;
		});
		return models;
	}
	function ensureDraft(vm) {
		if (!cardDrafts.has(vm.cardKey)) {
			const defaultMulti = vm.multi && vm.options.length > 0 ? [0] : [];
			cardDrafts.set(vm.cardKey, {
				sel: 0,
				multiSel: defaultMulti,
				useCustom: false,
				customOpen: false,
				customText: "",
				snoozedCount: 0
			});
		}
		return cardDrafts.get(vm.cardKey);
	}
	function isEmptyCustomSelected(vm, draft) {
		if (!vm || !draft || !vm.canCustom) return false;
		return (vm.multi ? draft.useCustom : draft.sel === vm.options.length) && !String(draft.customText || "").trim();
	}
	function showDragPill(text, bg, color) {
		const el = document.getElementById("triageDragPill");
		if (!el) return;
		el.textContent = text;
		el.style.background = bg;
		el.style.color = color;
		el.classList.add("show");
	}
	function hideDragPill(delay = 0) {
		const el = document.getElementById("triageDragPill");
		if (!el) return;
		if (!delay) el.classList.remove("show");
		else setTimeout(() => el.classList.remove("show"), delay);
	}
	function computeConfirmBtnModel(vm, draft) {
		const en = isEn();
		const tapOrSwipeSub = en ? "Tap here or swipe right" : "可点此 或 右滑卡片";
		if (vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length)) {
			if (String(draft.customText || "").trim()) return {
				cls: "orange",
				t1: en ? "Send New Plan 👉" : "发送新方案 👉",
				t2: tapOrSwipeSub
			};
			return {
				cls: "locked",
				t1: en ? "✍️ Type or hold to speak first" : "✍️ 请先输入或长按说话",
				t2: en ? "Enter your instructions to unlock" : "填写方案后即可点此或右滑发送"
			};
		}
		if (vm.multi) return {
			cls: "blue",
			t1: en ? `Confirm (${draft.multiSel.length}) 👉` : `确认 (${draft.multiSel.length}项) 👉`,
			t2: tapOrSwipeSub
		};
		const shortTxt = (vm.options[draft.sel] || vm.options[0] || {}).shortBtn || (en ? "Confirm" : "确认");
		if (vm.risk === "high" && draft.sel === 0) return {
			cls: "crimson",
			t1: en ? `🛡️ Hold 0.8s: ${shortTxt} 👉` : `🛡️ 按住0.8s：${shortTxt} 👉`,
			t2: en ? "Hold button or pull right 0.8s" : "长按此钮 或 右拉稳住0.8s"
		};
		return {
			cls: vm.kind === "question" ? "blue" : "",
			t1: `${shortTxt} 👉`,
			t2: tapOrSwipeSub
		};
	}
	function updateUndoBtnDom() {
		const undoBtn = document.getElementById("triageUndoBtn");
		if (!undoBtn) return;
		const en = isEn();
		while (undoStack.length > 0 && undoStack[undoStack.length - 1].type === "grace" && undoStack[undoStack.length - 1].flushed) undoStack.pop();
		if (undoStack.length === 0) {
			undoBtn.disabled = true;
			undoBtn.classList.remove("grace-active");
			undoBtn.textContent = en ? "↩ Undo" : "↩ 撤回";
			return;
		}
		const top = undoStack[undoStack.length - 1];
		undoBtn.disabled = false;
		if (top.type === "grace" && !top.flushed) {
			const remSec = Math.max(1, Math.ceil((top.expiresAt - Date.now()) / 1e3));
			undoBtn.classList.add("grace-active");
			undoBtn.textContent = en ? `↩ Undo (${remSec}s)` : `↩ 撤回 (${remSec}s)`;
		} else {
			undoBtn.classList.remove("grace-active");
			undoBtn.textContent = en ? "↩ Undo" : "↩ 撤回";
		}
	}
	function syncConfirmBtnOnly() {
		const cards = getOrderedActiveCards();
		if (!cards.length) return;
		const { vm } = cards[0];
		const m = computeConfirmBtnModel(vm, ensureDraft(vm));
		const btn = document.getElementById("triageConfirmBtn");
		const t1 = document.getElementById("triageBtnT1");
		const t2 = document.getElementById("triageBtnT2");
		if (btn) btn.className = `dsh-triage-btn-confirm ${m.cls}`;
		if (t1) t1.textContent = m.t1;
		if (t2) t2.textContent = m.t2;
	}
	function preHydrateTopCards(cards) {
		for (const item of cards.slice(0, 3)) {
			const s = item.session;
			if (s._wireTruncated || !item.vm.promptInfo.text || s.omittedTranscriptCount > 0 || s.hasMoreTranscript) deps.hydrateColdSession?.(s.hostId, s.id, s.sessionRev);
		}
	}
	function render({ force = false } = {}) {
		if (!isOpen) return;
		syncStaticChromeLang();
		const en = isEn();
		const lang = curLang();
		if (!force && (dragging || isRecording || document.activeElement?.id === "triageCustomTextarea")) {
			const countEl = document.getElementById("triageCountChip");
			if (countEl) countEl.textContent = String(getOrderedActiveCards().length);
			updateUndoBtnDom();
			return;
		}
		const cards = getOrderedActiveCards();
		preHydrateTopCards(cards);
		refreshOpenModalIfNeeded(cards);
		updateUndoBtnDom();
		const countChip = document.getElementById("triageCountChip");
		if (countChip) countChip.textContent = String(cards.length);
		const fgCard = document.getElementById("triageFgCard");
		const lRight = document.getElementById("triageLayerRight");
		const lRightInner = document.getElementById("triageLayerRightInner");
		const lLeft = document.getElementById("triageLayerLeft");
		const lDeep = document.getElementById("triageLayerDeep");
		if (!fgCard || !lRight || !lRightInner || !lLeft || !lDeep) return;
		const sig = `${lang}::` + cards.map((c) => {
			const d = ensureDraft(c.vm);
			return `${c.vm.cardKey}:${c.vm.promptInfo.text.length}:${c.vm.fullReplyMarkdown.length}:${c.vm.diffInfo.files.length}:${d.sel}:${d.multiSel.join(",")}:${d.useCustom ? 1 : 0}:${d.customOpen ? 1 : 0}:${d.snoozedCount}:${isRecording ? 1 : 0}`;
		}).join("|");
		if (!force && sig === lastRenderedSig && fgCard.children.length > 0) return;
		lastRenderedSig = sig;
		if (cards.length >= 2) {
			const nxt = cards[1].vm;
			lRight.style.display = "block";
			lRight.style.transform = `translate3d(${REST_X}px, ${REST_Y}px, 0) scale(${REST_SCALE}) rotate(${REST_ROT}deg)`;
			lRightInner.innerHTML = `
        <div style="opacity:0.42;display:flex;flex-direction:column;gap:8px;">
          <div class="dsh-triage-hdr">
            ${renderHarnessBadgeHtml(nxt.harness, "row", nxt.harness)}
            <div class="dsh-triage-hdr-info">
              <div class="dsh-triage-title">${esc(nxt.title)}</div>
              <div class="dsh-triage-sub">${esc(nxt.sub)}</div>
            </div>
          </div>
          <div class="dsh-triage-headline">${esc(nxt.headline)}</div>
        </div>`;
		} else lRight.style.display = "none";
		lLeft.style.display = cards.length >= 3 ? "block" : "none";
		lDeep.style.display = cards.length >= 4 ? "block" : "none";
		if (cards.length === 0) {
			const runningCount = (deps.getSessions?.() || []).filter((s) => s.status === "running").length;
			fgCard.classList.remove("is-high");
			const emptyTitle = en ? "All Pending Cards Cleared!" : "待处理卡片已全部清零！";
			const emptyDesc = runningCount > 0 ? en ? `<strong>${runningCount} task${runningCount === 1 ? " is" : "s are"} running</strong> in the background. Switch to List View for live progress.` : `目前还有 <strong>${runningCount} 个任务正在后台运行</strong>，切回列表模式即可查看实时进度。` : en ? "All pending approvals and unread conclusions are done." : "所有待授权与未读完结会话均已处理完毕。";
			const runBtnLbl = en ? `🟢 View Running Tasks (${runningCount}) ›` : `🟢 去列表查看运行中任务 (${runningCount}) ›`;
			fgCard.innerHTML = `
        <div style="margin:auto;text-align:center;padding:28px 18px;display:flex;flex-direction:column;gap:14px;align-items:center;">
          <div style="font-size:44px;">🎉</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${emptyTitle}</div>
          <div style="font-size:13px;color:#64748b;line-height:1.55;">
            ${emptyDesc}
          </div>
          ${runningCount > 0 ? `<button type="button" onclick="triageSwitchToRunningList()" style="width:100%;margin-top:6px;height:50px;border:none;border-radius:25px;background:linear-gradient(90deg,#2563eb,#4f46e5);color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(37,99,235,0.25);">${runBtnLbl}</button>` : `<button type="button" onclick="closeTriageDeckMode()" style="width:100%;margin-top:6px;height:50px;border:none;border-radius:25px;background:#0f172a;color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;">${en ? "☰ Back to Session List" : "☰ 返回会话列表"}</button>`}
        </div>`;
			return;
		}
		const { session: s, vm } = cards[0];
		const draft = ensureDraft(vm);
		fgCard.classList.toggle("is-high", vm.risk === "high");
		const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
		const btnModel = computeConfirmBtnModel(vm, draft);
		const firstImgPath = vm.promptInfo.mediaPaths[0] || "";
		const thumbSrc = firstImgPath ? buildLocalThumbSrc(vm.hostId, firstImgPath) : "";
		const thumbCountLbl = en ? `${vm.promptInfo.imageCount} img` : `${vm.promptInfo.imageCount}图`;
		const thumbHtml = vm.promptInfo.imageCount > 0 ? `<div class="dsh-triage-thumb">
          ${thumbSrc ? `<img src="${esc(thumbSrc)}" alt="${en ? "Image" : "附件图"}" onerror="this.style.display='none'" />` : "<span>🖼️</span>"}
          <span class="dsh-triage-thumb-count">${thumbCountLbl}</span>
         </div>` : "";
		const myPromptText = vm.promptInfo.text || s.title || (en ? "Tap to view conversation" : "点击查看对话详情");
		const fileCount = vm.diffInfo.files.length;
		const diffLabel = en ? `📄 Code Changes · ${fileCount} file${fileCount === 1 ? "" : "s"}` : `📄 代码改动 · ${fileCount} 个文件`;
		const diffBarHtml = fileCount > 0 ? `<div class="dsh-triage-diff-bar" onclick="openTriageFilesModal()">
          <span>${diffLabel}</span>
          <span style="font-family:var(--mono,monospace);font-weight:700;">
            ${vm.diffInfo.hasLineCounts ? `<span style="color:#16a34a">+${vm.diffInfo.totalAdd}</span><span style="color:#dc2626;margin-left:5px;">-${vm.diffInfo.totalDel}</span>` : `<span style="color:#64748b">${en ? "View" : "点此查看"}</span>`}
            <span style="color:#2563eb;margin-left:6px;">▾</span>
          </span>
        </div>` : "";
		const coreEvidenceHtml = vm.cmdLine ? `<div class="dsh-triage-cmd-box ${vm.risk === "high" ? "high" : ""}" onclick="openTriageCommandModal()">
          <div class="dsh-triage-cmd-reason">${esc(vm.cmdReason)}</div>
          <div class="dsh-triage-cmd-mono">${highlightDangerousCommandHtml(vm.cmdLine)}</div>
        </div>` : vm.replyPreview ? `<div class="dsh-triage-reply-card ${vm.kind === "interrupted" ? "interrupted" : ""}" onclick="openTriageReplyModal()">
            <div class="dsh-triage-clamp3">${esc(vm.replyPreview)}</div>
            <div style="color:#2563eb;font-size:11px;font-weight:700;margin-top:4px;">${en ? "Tap to read full reply ›" : "点击展开完整回复全文 ›"}</div>
          </div>` : "";
		const expandAskLbl = en ? `Tap to view full prompt${vm.promptInfo.imageCount > 0 ? " & image" : ""} ›` : `点击查看完整提问${vm.promptInfo.imageCount > 0 ? "与截图" : ""} ›`;
		fgCard.innerHTML = `
      <div class="dsh-triage-body" id="triageCardBody">
        <div class="dsh-triage-hdr">
          ${renderHarnessBadgeHtml(vm.harness, "row", vm.harness)}
          <div class="dsh-triage-hdr-info">
            <div class="dsh-triage-title-row">
              <div class="dsh-triage-title">${esc(vm.title)}</div>
              <button type="button" class="dsh-triage-open-chat" onclick="event.stopPropagation(); triageOpenFullSession('${esc(vm.sessionId)}')">${en ? "Chat ›" : "对话 ›"}</button>
            </div>
            <div class="dsh-triage-sub">
              <span>${esc(vm.sub)}</span>
              ${draft.snoozedCount > 0 ? `<span class="dsh-triage-snooze-tag">${en ? "↪ Snoozed" : "↪ 稍后看"}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="dsh-triage-my-ask" onclick="openTriagePromptModal()">
          <div class="dsh-triage-my-ask-body">
            <div class="dsh-triage-clamp2"><strong>${en ? "Me: " : "我："}</strong>${esc(myPromptText)}</div>
            <div style="color:#2563eb;font-size:11px;font-weight:700;margin-top:2px;">${expandAskLbl}</div>
          </div>
          ${thumbHtml}
        </div>

        <p class="dsh-triage-headline">${esc(vm.headline)}</p>

        ${coreEvidenceHtml}
        ${diffBarHtml}

        <div class="dsh-triage-opts">
          ${vm.options.map((o, oi) => {
			const isSel = vm.multi ? draft.multiSel.includes(oi) : !customActive && draft.sel === oi;
			return `
              <div class="dsh-triage-opt ${isSel ? vm.kind === "question" ? "sel-blue" : "sel-green" : ""}" onclick="triagePickOption(${oi})">
                <div class="dsh-triage-dot ${vm.multi ? "sq" : ""}">${isSel ? "✓" : ""}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;word-break:break-word;">${esc(o.label)}</div>
                  ${o.desc ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px;line-height:1.35;">${esc(o.desc)}</div>` : ""}
                </div>
              </div>`;
		}).join("")}

          ${vm.canCustom ? `
            <div class="dsh-triage-custom ${customActive ? "sel" : ""} ${isRecording ? "rec" : ""}" id="triageCustomBox"
              onmousedown="triageCustomDown(event)" onmouseup="triageCustomUp(event)" onmouseleave="triageCustomCancel()"
              ontouchstart="triageCustomDown(event)" ontouchend="triageCustomUp(event)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                  <div class="dsh-triage-dot">${customActive ? "✓" : ""}</div>
                  <div style="min-width:0;">
                    <div style="font-size:13px;font-weight:700;color:#9a3412;">${esc(vm.customLabel)}</div>
                    <div style="font-size:11px;color:#ea580c;font-weight:600;">
                      ${isRecording ? en ? "🎙️ Listening… Release to insert text" : "🎙️ 正在聆听语音… 松手落入输入框" : en ? "Tap to type · Hold to speak" : "短按弹键盘打字 · 长按直接说话"}
                    </div>
                  </div>
                </div>
                <span class="dsh-triage-mic-chip">${isRecording ? en ? "🔴 Live" : "🔴 听写中" : en ? "🎙️ Hold" : "🎙️ 长按说"}</span>
              </div>
              ${draft.customOpen ? `
                <textarea class="dsh-triage-ta" id="triageCustomTextarea" rows="2" placeholder="${en ? "Type your instructions, or hold above to append voice…" : "输入你的方案，或继续长按上方追加语音…"}"
                  onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()"
                  oninput="triageUpdateCustomText(this.value)">${esc(draft.customText)}</textarea>` : ""}
            </div>` : ""}
        </div>
      </div>

      <div class="dsh-triage-dock">
        <button type="button" class="dsh-triage-btn-snooze" onclick="triageTapSnooze()">
          <span>👈</span>
          <span>${en ? "Snooze" : "搁置"}</span>
        </button>
        <button type="button" class="dsh-triage-btn-confirm ${btnModel.cls}" id="triageConfirmBtn"
          onmousedown="triageConfirmBtnDown(event)" onmouseup="triageConfirmBtnUp(event)" onmouseleave="triageConfirmBtnCancel()"
          ontouchstart="triageConfirmBtnDown(event)" ontouchend="triageConfirmBtnUp(event)">
          <div class="dsh-triage-btn-prog" id="triageBtnProg"></div>
          <span class="dsh-triage-btn-t1" id="triageBtnT1">${esc(btnModel.t1)}</span>
          <span class="dsh-triage-btn-t2" id="triageBtnT2">${esc(btnModel.t2)}</span>
        </button>
      </div>
    `;
	}
	function nudgeEmptyCustom() {
		const box = document.getElementById("triageCustomBox");
		if (box) {
			box.classList.remove("dsh-triage-shake");
			box.offsetWidth;
			box.classList.add("dsh-triage-shake");
		}
		showDragPill(isEn() ? "✍️ Empty input — type or hold to speak first" : "✍️ 内容为空，请先打字或长按说话", "#ea580c", "#ffffff");
		hideDragPill(1e3);
		setTimeout(() => document.getElementById("triageCustomTextarea")?.focus(), 50);
	}
	function startLiveSpeechDictation(vm, draft) {
		const SpeechCtor = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
		if (!SpeechCtor) {
			isRecording = false;
			deps.showToast?.(isEn() ? "Speech dictation is unavailable in this browser; please type instead" : "当前浏览器环境不支持语音听写，请直接键盘输入");
			render({ force: true });
			setTimeout(() => document.getElementById("triageCustomTextarea")?.focus(), 40);
			return;
		}
		try {
			if (speechRec) try {
				speechRec.abort();
			} catch {}
			const rec = new SpeechCtor();
			rec.lang = isEn() ? "en-US" : "zh-CN";
			rec.continuous = true;
			rec.interimResults = true;
			const baseText = String(draft.customText || "").trim();
			let latestRaw = "";
			rec.onresult = (ev) => {
				let chunk = "";
				for (let i = 0; i < ev.results.length; i += 1) chunk += ev.results[i][0]?.transcript || "";
				latestRaw = deps.punctuateSpeechText ? deps.punctuateSpeechText(chunk, null, { finalizeSentence: false }) : chunk;
				draft.customText = baseText ? `${baseText} ${latestRaw}` : latestRaw;
				const ta = document.getElementById("triageCustomTextarea");
				if (ta) ta.value = draft.customText;
				syncConfirmBtnOnly();
			};
			rec.onerror = () => {
				isRecording = false;
				speechRec = null;
				render({ force: true });
			};
			rec.onend = () => {
				if (latestRaw) {
					const finalClean = deps.punctuateSpeechText ? deps.punctuateSpeechText(latestRaw, null, { finalizeSentence: true }) : latestRaw;
					draft.customText = baseText ? `${baseText} ${finalClean}` : finalClean;
				}
				isRecording = false;
				speechRec = null;
				render({ force: true });
			};
			speechRec = rec;
			rec.start();
		} catch {
			isRecording = false;
			speechRec = null;
			render({ force: true });
		}
	}
	function stopLiveSpeechDictation() {
		if (speechRec) {
			const r = speechRec;
			speechRec = null;
			setTimeout(() => {
				try {
					r.stop();
				} catch {}
			}, 240);
		} else isRecording = false;
	}
	function scheduleGraceCommit(vm, session, commitFn) {
		flushAllGraceCommits();
		dismissedKeys.set(vm.cardKey, Date.now() + 45e3);
		const entry = {
			type: "grace",
			cardKey: vm.cardKey,
			sessionId: session.id,
			expiresAt: Date.now() + GRACE_UNDO_MS,
			flushed: false,
			commitFn,
			graceTimer: null
		};
		entry.graceTimer = setTimeout(() => {
			entry.graceTimer = null;
			entry.flushed = true;
			clearInterval(graceCountdownTimer);
			graceCountdownTimer = null;
			updateUndoBtnDom();
			commitFn();
		}, GRACE_UNDO_MS);
		undoStack.push(entry);
		clearInterval(graceCountdownTimer);
		graceCountdownTimer = setInterval(() => {
			updateUndoBtnDom();
		}, 300);
		updateUndoBtnDom();
	}
	function buildCommitAction(session, vm, draft) {
		const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
		const customText = String(draft.customText || "").trim();
		if (vm.kind === "question") {
			const answers = {};
			if (customActive) answers[vm.qId] = vm.multi ? [customText] : customText;
			else if (vm.multi) {
				const picked = draft.multiSel.map((i) => vm.options[i]?.value).filter(Boolean);
				answers[vm.qId] = picked;
			} else answers[vm.qId] = vm.options[draft.sel]?.value || vm.options[0]?.value || "";
			return async () => {
				await deps.submitQuestionDecision?.(session, vm.code, answers);
			};
		}
		if (vm.kind === "approval") {
			if (customActive) return async () => {
				await deps.sendApprovalDecision?.(session.hostId, vm.code, false, vm.denyOptionIndex || 4, session.id);
				if (customText) await deps.sendPromptToSession?.(session, customText);
			};
			const chosen = vm.options[draft.sel] || vm.options[0];
			const optIdx = Number(chosen?.optionIndex) || 1;
			return async () => {
				await deps.sendApprovalDecision?.(session.hostId, vm.code, true, optIdx, session.id);
			};
		}
		if (customActive && customText) return async () => {
			deps.markSessionRead?.(session);
			await deps.sendPromptToSession?.(session, customText);
		};
		return null;
	}
	function confirmTopCard() {
		const cards = getOrderedActiveCards();
		if (!cards.length) return;
		const { session, vm } = cards[0];
		const draft = ensureDraft(vm);
		if (isEmptyCustomSelected(vm, draft)) {
			nudgeEmptyCustom();
			return;
		}
		const fgCard = document.getElementById("triageFgCard");
		const lRight = document.getElementById("triageLayerRight");
		const commitFn = buildCommitAction(session, vm, draft);
		if (!commitFn) {
			const prevSnapshot = deps.markSessionRead?.(session);
			dismissedKeys.set(vm.cardKey, Date.now() + 5e3);
			undoStack.push({
				type: "read",
				cardKey: vm.cardKey,
				sessionId: session.id,
				prevSnapshot
			});
			showDragPill(isEn() ? "✓ Marked as read" : "✓ 已标为已读", "#059669", "#ffffff");
			hideDragPill(650);
		} else {
			scheduleGraceCommit(vm, session, commitFn);
			showDragPill(isEn() ? "✓ Confirmed (tap Undo within 2s to cancel)" : "✓ 已确认（2秒内可点左上角撤回）", "#059669", "#ffffff");
			hideDragPill(1100);
		}
		if (fgCard && lRight) {
			fgCard.style.transform = "translate3d(340px, 0, 0) rotate(13deg)";
			fgCard.style.opacity = "0";
			lRight.classList.remove("following");
			lRight.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
			setTimeout(() => {
				fgCard.classList.add("dragging");
				fgCard.style.transform = "translate3d(0,0,0)";
				fgCard.style.opacity = "1";
				render({ force: true });
				deps.onDeckChanged?.();
				requestAnimationFrame(() => fgCard.classList.remove("dragging"));
			}, 210);
		} else {
			render({ force: true });
			deps.onDeckChanged?.();
		}
	}
	function snoozeTopCard() {
		const cards = getOrderedActiveCards();
		if (!cards.length) return;
		if (cards.length === 1) {
			showDragPill(isEn() ? "Only 1 pending card left" : "只剩最后 1 张待处理啦", "#475569", "#ffffff");
			hideDragPill(700);
			return;
		}
		const { session, vm } = cards[0];
		const draft = ensureDraft(vm);
		const prevSnooze = snoozeOrder.get(vm.cardKey) || 0;
		snoozeSeq += 1;
		snoozeOrder.set(vm.cardKey, snoozeSeq);
		draft.snoozedCount = (draft.snoozedCount || 0) + 1;
		undoStack.push({
			type: "snooze",
			cardKey: vm.cardKey,
			sessionId: session.id,
			prevSnooze
		});
		showDragPill(isEn() ? "↪ Snoozed to back of deck" : "↪ 已搁置到牌堆后面", "#475569", "#ffffff");
		hideDragPill(700);
		const fgCard = document.getElementById("triageFgCard");
		const lRight = document.getElementById("triageLayerRight");
		if (fgCard && lRight) {
			fgCard.classList.add("tucking");
			lRight.classList.remove("following");
			lRight.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
			setTimeout(() => {
				fgCard.classList.remove("tucking");
				fgCard.classList.add("dragging");
				fgCard.style.transform = "translate3d(0,0,0)";
				fgCard.style.opacity = "1";
				render({ force: true });
				requestAnimationFrame(() => fgCard.classList.remove("dragging"));
			}, 320);
		} else render({ force: true });
	}
	function undoLast() {
		const en = isEn();
		while (undoStack.length > 0 && undoStack[undoStack.length - 1].type === "grace" && undoStack[undoStack.length - 1].flushed) undoStack.pop();
		if (!undoStack.length) return;
		const last = undoStack.pop();
		if (last.type === "grace") {
			if (last.graceTimer) clearTimeout(last.graceTimer);
			last.graceTimer = null;
			dismissedKeys.delete(last.cardKey);
			showDragPill(en ? "↩ Cancelled in time! Not sent to computer" : "↩ 已成功拦截撤回！尚未发往电脑", "#ea580c", "#ffffff");
			hideDragPill(1e3);
		} else if (last.type === "snooze") {
			if (last.prevSnooze) snoozeOrder.set(last.cardKey, last.prevSnooze);
			else snoozeOrder.delete(last.cardKey);
			showDragPill(en ? "↩ Restored previous card" : "↩ 已撤回上一张卡片", "#334155", "#ffffff");
			hideDragPill(700);
		} else if (last.type === "read") {
			dismissedKeys.delete(last.cardKey);
			deps.restoreSessionUnread?.(last.sessionId, last.prevSnapshot);
			showDragPill(en ? "↩ Restored as unread" : "↩ 已恢复为未读待阅", "#334155", "#ffffff");
			hideDragPill(700);
		}
		render({ force: true });
		deps.onDeckChanged?.();
	}
	function setModalExpanded(nextExpanded) {
		modalExpanded = Boolean(nextExpanded);
		const en = isEn();
		const sheet = document.getElementById("triageDetailModalContent");
		const expBtn = document.getElementById("triageModalExpandBtn");
		if (sheet) {
			sheet.classList.remove("sheet-dragging");
			sheet.style.height = "";
			sheet.style.transform = "";
			sheet.classList.toggle("expanded", modalExpanded);
		}
		if (expBtn) expBtn.textContent = modalExpanded ? en ? "⤡ Half" : "⤡ 半屏" : en ? "⤢ Full" : "⤢ 全屏";
	}
	function buildPromptModalBodyHtml(top) {
		const en = isEn();
		const { vm, session } = top;
		const imgsHtml = vm.promptInfo.mediaPaths.map((p) => {
			const enc = encodeURIComponent(p).replace(/'/g, "%27");
			const fullSrc = buildLocalThumbSrc(vm.hostId, p);
			return `<div style="margin-top:10px;" onclick="closeTriageDetailModal(); triageInspectSessionFile('${esc(vm.sessionId)}', '${enc}')">
        <img src="${esc(fullSrc)}" alt="${en ? "Prompt Image" : "提问原图"}" style="max-width:100%;max-height:48vh;border-radius:12px;border:1px solid #cbd5e1;cursor:pointer;" />
        <div style="font-size:11.5px;color:#2563eb;font-weight:700;margin-top:4px;">${en ? "🔍 Tap to open full-res image viewer" : "🔍 点击打开高清原图预览器"}</div>
      </div>`;
		}).join("");
		const loadingHint = session._wireTruncated ? `<div style="margin-top:10px;padding:8px 12px;border-radius:10px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">${en ? "⏳ Syncing full prompt…" : "⏳ 正在同步完整提问内容…"}</div>` : "";
		return `<div style="font-size:14px;line-height:1.65;color:#1e293b;background:#f8fafc;padding:13px;border-radius:14px;white-space:pre-wrap;word-break:break-word;">${esc(vm.promptInfo.text || session.title)}</div>${imgsHtml}${loadingHint}`;
	}
	function buildReplyModalBodyHtml(top) {
		const en = isEn();
		const { vm, session } = top;
		const rawMd = vm.fullReplyMarkdown || vm.headline;
		return `<div class="md-body" style="font-size:14px;line-height:1.68;padding:2px 2px 6px;color:#0f172a;">${deps.formatAssistantText ? deps.formatAssistantText(rawMd, vm.artifacts) : `<div style="white-space:pre-wrap;">${esc(rawMd)}</div>`}</div>${session._wireTruncated ? `<div style="margin-top:12px;padding:9px 12px;border-radius:10px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">${en ? "⏳ Fetching full untruncated reply…" : "⏳ 正在从云端拉取完整未截断全文…"}</div>` : ""}${`<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:flex;justify-content:center;">
      <button type="button" class="dsh-triage-open-chat" style="padding:7px 14px;font-size:12.5px;" onclick="closeTriageDetailModal(); triageOpenFullSession('${esc(vm.sessionId)}')">${en ? "💬 Open Full Conversation ›" : "💬 进入完整对话上下文 ›"}</button>
    </div>`}`;
	}
	function refreshOpenModalIfNeeded(cards) {
		if (!activeModalKind) return;
		const modal = document.getElementById("triageDetailModal");
		const titleEl = document.getElementById("triageModalTitle");
		const scrollBody = document.getElementById("triageModalScrollBody");
		if (!modal?.classList.contains("open") || !scrollBody) return;
		const target = cards.find((c) => c.vm.sessionId === activeModalSessionId) || cards[0];
		if (!target) return;
		const en = isEn();
		const langFlag = en ? 4 : 0;
		if (activeModalKind === "reply") {
			if (titleEl) titleEl.textContent = en ? "📖 Latest Full AI Reply" : "📖 AI 最新完整回复";
			const nextSigLen = (target.vm.fullReplyMarkdown || "").length * 8 + (target.session._wireTruncated ? 1 : 0) + langFlag;
			if (nextSigLen !== lastModalRenderedLen) {
				const prevTop = scrollBody.scrollTop;
				lastModalRenderedLen = nextSigLen;
				scrollBody.innerHTML = buildReplyModalBodyHtml(target);
				scrollBody.scrollTop = prevTop;
			}
		} else if (activeModalKind === "prompt") {
			if (titleEl) titleEl.textContent = en ? "💬 My Full Prompt" : "💬 我发送的完整提问";
			const nextSigLen = (target.vm.promptInfo.text || "").length * 8 + (target.session._wireTruncated ? 1 : 0) + langFlag;
			if (nextSigLen !== lastModalRenderedLen) {
				const prevTop = scrollBody.scrollTop;
				lastModalRenderedLen = nextSigLen;
				scrollBody.innerHTML = buildPromptModalBodyHtml(target);
				scrollBody.scrollTop = prevTop;
			}
		}
	}
	function bindModalSheetGestures() {
		if (modalSheetBound || typeof window === "undefined") return;
		const modal = document.getElementById("triageDetailModal");
		const sheet = document.getElementById("triageDetailModalContent");
		const hdr = document.getElementById("triageModalHeader");
		const scrollBody = document.getElementById("triageModalScrollBody");
		if (!modal || !sheet || !hdr || !scrollBody) return;
		modalSheetBound = true;
		let hDragging = false;
		let hStartY = 0;
		let hLastY = 0;
		let hStartAt = 0;
		let hStartHeight = 0;
		let hOverlayHeight = 0;
		function onHdrStart(clientY, target) {
			if (target?.closest?.("button")) return;
			hDragging = true;
			hStartY = clientY;
			hLastY = clientY;
			hStartAt = Date.now();
			hOverlayHeight = modal.getBoundingClientRect().height || window.innerHeight || 700;
			hStartHeight = sheet.getBoundingClientRect().height || hOverlayHeight * .68;
			sheet.classList.add("sheet-dragging");
		}
		function onHdrMove(clientY, ev) {
			if (!hDragging) return;
			if (ev && ev.cancelable) ev.preventDefault();
			hLastY = clientY;
			const deltaY = clientY - hStartY;
			const candidateH = hStartHeight - deltaY;
			const minResizeH = hOverlayHeight * .46;
			const maxResizeH = hOverlayHeight * .94;
			if (candidateH < minResizeH) {
				sheet.style.height = `${minResizeH}px`;
				sheet.style.transform = `translateY(${Math.max(0, minResizeH - candidateH)}px)`;
			} else {
				sheet.style.transform = "";
				sheet.style.height = `${Math.min(maxResizeH, candidateH)}px`;
			}
		}
		function onHdrEnd() {
			if (!hDragging) return;
			hDragging = false;
			const deltaY = hLastY - hStartY;
			const vy = deltaY / Math.max(1, Date.now() - hStartAt);
			const curH = sheet.getBoundingClientRect().height || hStartHeight;
			sheet.classList.remove("sheet-dragging");
			sheet.style.height = "";
			sheet.style.transform = "";
			if (deltaY < -24 || vy < -.28 || curH > hOverlayHeight * .8) {
				setModalExpanded(true);
				return;
			}
			if (deltaY > 28 || vy > .35) {
				if (modalExpanded && deltaY < 190 && vy < .7) setModalExpanded(false);
				else if (deltaY > 65 || vy > .42) closeDetailModal();
				else setModalExpanded(modalExpanded);
				return;
			}
			setModalExpanded(modalExpanded);
		}
		hdr.addEventListener("touchstart", (e) => {
			if (e.touches?.[0]) onHdrStart(e.touches[0].clientY, e.target);
		}, { passive: true });
		window.addEventListener("touchmove", (e) => {
			if (hDragging && e.touches?.[0]) onHdrMove(e.touches[0].clientY, e);
		}, { passive: false });
		window.addEventListener("touchend", onHdrEnd);
		window.addEventListener("touchcancel", onHdrEnd);
		hdr.addEventListener("mousedown", (e) => {
			if (e.button === 0) onHdrStart(e.clientY, e.target);
		});
		window.addEventListener("mousemove", (e) => {
			if (hDragging) onHdrMove(e.clientY, null);
		});
		window.addEventListener("mouseup", onHdrEnd);
		let bTracking = false;
		let bPullingDown = false;
		let bStartX = 0;
		let bStartY = 0;
		let bLastY = 0;
		let bStartTop = 0;
		let bStartAt = 0;
		scrollBody.addEventListener("touchstart", (e) => {
			if (!e.touches?.[0]) return;
			bTracking = true;
			bPullingDown = false;
			bStartX = e.touches[0].clientX;
			bStartY = e.touches[0].clientY;
			bLastY = bStartY;
			bStartTop = scrollBody.scrollTop;
			bStartAt = Date.now();
		}, { passive: true });
		scrollBody.addEventListener("touchmove", (e) => {
			if (!bTracking || !e.touches?.[0]) return;
			const cx = e.touches[0].clientX;
			const cy = e.touches[0].clientY;
			const bDx = cx - bStartX;
			const bDy = cy - bStartY;
			bLastY = cy;
			if (!bPullingDown && bDy < -24 && Math.abs(bDy) > Math.abs(bDx)) {
				if (!modalExpanded && scrollBody.scrollHeight > scrollBody.clientHeight + 12) setModalExpanded(true);
				return;
			}
			if (bStartTop <= 1 && scrollBody.scrollTop <= 1 && bDy > 14 && bDy > Math.abs(bDx) * 1.15) {
				bPullingDown = true;
				if (e.cancelable) e.preventDefault();
				sheet.classList.add("sheet-dragging");
				sheet.style.transform = `translateY(${Math.max(0, bDy * .78)}px)`;
			}
		}, { passive: false });
		const finishBodyTouch = () => {
			if (!bTracking) return;
			bTracking = false;
			if (!bPullingDown) return;
			bPullingDown = false;
			const bDy = bLastY - bStartY;
			const vy = bDy / Math.max(1, Date.now() - bStartAt);
			sheet.classList.remove("sheet-dragging");
			sheet.style.transform = "";
			if (bDy > 68 || vy > .5) {
				if (modalExpanded && bDy < 180 && vy < .75) setModalExpanded(false);
				else closeDetailModal();
			}
		};
		scrollBody.addEventListener("touchend", finishBodyTouch);
		scrollBody.addEventListener("touchcancel", finishBodyTouch);
	}
	function openModalView({ title, bodyHtml, kind = "", sessionId = "", sigLen = 0, defaultExpanded = false }) {
		const modal = document.getElementById("triageDetailModal");
		const titleEl = document.getElementById("triageModalTitle");
		const scrollBody = document.getElementById("triageModalScrollBody");
		if (!modal || !scrollBody) return;
		bindModalSheetGestures();
		activeModalKind = kind;
		activeModalSessionId = sessionId;
		lastModalRenderedLen = sigLen;
		if (titleEl) titleEl.textContent = title;
		scrollBody.innerHTML = bodyHtml;
		scrollBody.scrollTop = 0;
		setModalExpanded(defaultExpanded);
		modal.classList.add("open");
	}
	function closeDetailModal() {
		activeModalKind = "";
		activeModalSessionId = "";
		lastModalRenderedLen = -1;
		const modal = document.getElementById("triageDetailModal");
		const sheet = document.getElementById("triageDetailModalContent");
		if (sheet) {
			sheet.classList.remove("sheet-dragging", "expanded");
			sheet.style.height = "";
			sheet.style.transform = "";
		}
		modal?.classList.remove("open");
	}
	function bindCardGestureListeners() {
		if (listenersBound || typeof window === "undefined") return;
		const stackEl = document.getElementById("triageCardStack");
		const fgCard = document.getElementById("triageFgCard");
		if (!stackEl || !fgCard) return;
		listenersBound = true;
		function resetCardPos() {
			const lRight = document.getElementById("triageLayerRight");
			fgCard.style.transform = "translate3d(0,0,0)";
			if (lRight) lRight.style.transform = `translate3d(${REST_X}px, ${REST_Y}px, 0) scale(${REST_SCALE}) rotate(${REST_ROT}deg)`;
		}
		function onPointerStart(clientX, clientY, target) {
			if (!isOpen) return;
			if (document.getElementById("triageDetailModal")?.classList.contains("open")) return;
			if (target?.closest?.(".dsh-triage-custom, textarea")) return;
			if (!getOrderedActiveCards().length) return;
			dragging = true;
			axisLocked = "";
			sx = clientX;
			sy = clientY;
			dx = 0;
			dy = 0;
			maxDx = 0;
			dragStartAt = Date.now();
			startedInDock = Boolean(target?.closest?.(".dsh-triage-dock"));
			startedOnConfirmBtn = Boolean(target?.closest?.("#triageConfirmBtn"));
			rightDragUnlocked = false;
			clearInterval(rightDragHoldTimer);
			rightDragHoldTimer = null;
		}
		function onPointerMove(clientX, clientY, ev) {
			if (!dragging || !isOpen) return;
			dx = clientX - sx;
			dy = clientY - sy;
			if (dx > maxDx) maxDx = dx;
			if (!axisLocked) {
				if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
				axisLocked = Math.abs(dx) >= Math.abs(dy) * .92 ? "x" : "y";
			}
			if (axisLocked !== "x") return;
			if (ev && ev.cancelable) ev.preventDefault();
			if (Math.abs(dx) >= 12) {
				btnPressMoved = true;
				clearInterval(holdTimer);
				holdTimer = null;
			}
			const progBar = document.getElementById("triageBtnProg");
			const stackDom = document.getElementById("triageCardStack");
			const lRight = document.getElementById("triageLayerRight");
			fgCard.classList.add("dragging");
			lRight?.classList.add("following");
			stackDom?.classList.toggle("dragging-right", dx > 16);
			stackDom?.classList.toggle("dragging-left", dx < -16);
			const cards = getOrderedActiveCards();
			if (!cards.length) return;
			const { vm } = cards[0];
			const draft = ensureDraft(vm);
			if (dx > 0 && isEmptyCustomSelected(vm, draft)) {
				const lockedX = Math.min(24, Math.pow(dx, .52) * 1.6);
				fgCard.style.transform = `translate3d(${lockedX}px, 0, 0)`;
				showDragPill(isEn() ? "✍️ Empty input — type or hold to speak first" : "✍️ 手工填写为空，请先打字或长按说话", "#ea580c", "#ffffff");
				return;
			}
			const ratio = Math.min(1, Math.abs(dx) / (startedInDock ? 64 : 105));
			if (lRight) lRight.style.transform = `translate3d(${REST_X * (1 - ratio)}px, ${REST_Y * (1 - ratio)}px, 0) scale(${REST_SCALE + .016000000000000014 * ratio}) rotate(${REST_ROT * (1 - ratio)}deg)`;
			const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
			const isHighRiskConfirm = dx > 0 && !customActive && !vm.multi && vm.risk === "high" && draft.sel === 0;
			const highRiskHoldZone = startedInDock ? 32 : 68;
			const en = isEn();
			if (isHighRiskConfirm) {
				const dampedX = Math.min(104, Math.pow(dx, .75) * 2.15);
				fgCard.style.transform = `translate3d(${dampedX}px, 0, 0) rotate(${dampedX * .045}deg)`;
				if (dx > highRiskHoldZone && !rightDragHoldTimer && !rightDragUnlocked) {
					let pct = 15;
					if (progBar) progBar.style.width = `${pct}%`;
					showDragPill(en ? "🛡️ High-risk guard · Hold steady 0.8s…" : "🛡️ 高危防手滑 · 稳住 0.8s 蓄力中…", "#e11d48", "#ffffff");
					rightDragHoldTimer = setInterval(() => {
						pct += 14;
						const b = document.getElementById("triageBtnProg");
						if (b) b.style.width = `${Math.min(100, pct)}%`;
						if (pct >= 100) {
							clearInterval(rightDragHoldTimer);
							rightDragHoldTimer = null;
							rightDragUnlocked = true;
							navigator.vibrate?.(25);
							showDragPill(isEn() ? "🔓 Unlocked! Release to confirm" : "🔓 蓄力完成！松手确认放行", "#059669", "#ffffff");
						}
					}, 85);
				} else if (dx <= highRiskHoldZone && !rightDragUnlocked) {
					clearInterval(rightDragHoldTimer);
					rightDragHoldTimer = null;
					if (progBar) progBar.style.width = `${Math.min(30, dx * .35)}%`;
					showDragPill(en ? "🛡️ Pull right & hold 0.8s to confirm" : "🛡️ 继续右拉稳住 0.8s 确认", "#e11d48", "#ffffff");
				}
			} else {
				const moveX = startedInDock ? dx * 1.05 : dx * .86;
				fgCard.style.transform = `translate3d(${moveX}px, 0, 0) rotate(${moveX * .045}deg)`;
				const pillThreshold = startedInDock ? 20 : 34;
				if (dx > pillThreshold) showDragPill(en ? "👉 Release to confirm" : "👉 松手确认提交", "#059669", "#ffffff");
				else if (dx < -pillThreshold) showDragPill(en ? "👈 Release to snooze" : "👈 松手搁置到后面", "#475569", "#ffffff");
				else hideDragPill();
			}
		}
		function cleanupDragVisuals() {
			dragging = false;
			clearInterval(rightDragHoldTimer);
			rightDragHoldTimer = null;
			document.getElementById("triageCardStack")?.classList.remove("dragging-right", "dragging-left");
			const progBar = document.getElementById("triageBtnProg");
			if (progBar) progBar.style.width = "0%";
			fgCard.classList.remove("dragging");
			document.getElementById("triageLayerRight")?.classList.remove("following");
		}
		function onPointerEnd() {
			if (!dragging) return;
			cleanupDragVisuals();
			if (axisLocked === "x") {
				const top = getOrderedActiveCards()[0];
				if (top) {
					const { vm } = top;
					const draft = ensureDraft(vm);
					const dt = Math.max(1, Date.now() - dragStartAt);
					const vx = dx / dt;
					if (dx > (startedInDock ? 18 : 30) && isEmptyCustomSelected(vm, draft)) {
						resetCardPos();
						nudgeEmptyCustom();
						return;
					}
					if (startedOnConfirmBtn && dx >= 12 && dx >= maxDx - 10 || startedInDock && (dx >= 28 || dx >= 16 && vx > .24) || dx >= 56 || dx >= 30 && vx > .32) {
						if (!(vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length)) && !vm.multi && vm.risk === "high" && draft.sel === 0 && !rightDragUnlocked) {
							resetCardPos();
							showDragPill(isEn() ? "🛡️ High-risk: hold 0.8s or pull right & hold" : "🛡️ 高危操作请按住 0.8s 或右拉稳住 0.8s", "#e11d48", "#ffffff");
							hideDragPill(800);
							return;
						}
						confirmTopCard();
						return;
					}
					if (startedInDock && (dx <= -32 || dx <= -18 && vx < -.24) || dx <= -56 || dx <= -30 && vx < -.32) {
						snoozeTopCard();
						return;
					}
				}
			}
			resetCardPos();
			hideDragPill();
		}
		function onPointerCancel() {
			if (!dragging) return;
			cleanupDragVisuals();
			resetCardPos();
			hideDragPill();
		}
		stackEl.addEventListener("touchstart", (e) => {
			if (e.touches?.[0]) onPointerStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
		}, { passive: true });
		window.addEventListener("touchmove", (e) => {
			if (isOpen && dragging && e.touches?.[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
		}, { passive: false });
		window.addEventListener("touchend", onPointerEnd);
		window.addEventListener("touchcancel", onPointerCancel);
		stackEl.addEventListener("mousedown", (e) => {
			if (e.button === 0) onPointerStart(e.clientX, e.clientY, e.target);
		});
		window.addEventListener("mousemove", (e) => {
			if (isOpen && dragging) onPointerMove(e.clientX, e.clientY, null);
		});
		window.addEventListener("mouseup", onPointerEnd);
		window.addEventListener("beforeunload", flushAllGraceCommits);
	}
	if (typeof window !== "undefined") Object.assign(window, {
		openTriageDeckMode() {
			isOpen = true;
			lastRenderedSig = "";
			document.getElementById("triageDeckOverlay")?.classList.add("open");
			bindCardGestureListeners();
			bindModalSheetGestures();
			render({ force: true });
		},
		closeTriageDeckMode() {
			flushAllGraceCommits();
			stopLiveSpeechDictation();
			closeDetailModal();
			isOpen = false;
			document.getElementById("triageDeckOverlay")?.classList.remove("open");
			deps.onDeckChanged?.();
		},
		triageSwitchToRunningList() {
			window.closeTriageDeckMode?.();
			deps.switchToRunningList?.();
		},
		triageUndoLast: undoLast,
		triageTapSnooze() {
			if (!btnPressMoved) snoozeTopCard();
		},
		triageOpenFullSession(sessionId) {
			if (!sessionId) return;
			deps.openSession?.(sessionId);
		},
		triagePickOption(oi) {
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			const draft = ensureDraft(top.vm);
			if (top.vm.multi) {
				draft.useCustom = false;
				const pos = draft.multiSel.indexOf(oi);
				if (pos >= 0 && draft.multiSel.length > 1) draft.multiSel.splice(pos, 1);
				else if (pos < 0) draft.multiSel.push(oi);
			} else draft.sel = oi;
			render({ force: true });
		},
		triageUpdateCustomText(val) {
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			const draft = ensureDraft(top.vm);
			draft.customText = String(val ?? "");
			syncConfirmBtnOnly();
		},
		triageCustomDown(e) {
			if (e.target?.tagName === "TEXTAREA") return;
			e.stopPropagation();
			isLongPress = false;
			clearTimeout(lpTimer);
			lpTimer = setTimeout(() => {
				const top = getOrderedActiveCards()[0];
				if (!top) return;
				const draft = ensureDraft(top.vm);
				isLongPress = true;
				isRecording = true;
				navigator.vibrate?.(18);
				if (top.vm.multi) draft.useCustom = true;
				else draft.sel = top.vm.options.length;
				draft.customOpen = true;
				render({ force: true });
				startLiveSpeechDictation(top.vm, draft);
			}, 240);
		},
		triageCustomUp(e) {
			if (e.target?.tagName === "TEXTAREA") return;
			e.stopPropagation();
			clearTimeout(lpTimer);
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			const draft = ensureDraft(top.vm);
			if (isLongPress) stopLiveSpeechDictation();
			else {
				if (top.vm.multi) draft.useCustom = true;
				else draft.sel = top.vm.options.length;
				draft.customOpen = true;
				render({ force: true });
				setTimeout(() => document.getElementById("triageCustomTextarea")?.focus(), 45);
			}
		},
		triageCustomCancel() {
			clearTimeout(lpTimer);
			if (isRecording) stopLiveSpeechDictation();
		},
		triageConfirmBtnDown() {
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			btnPressMoved = false;
			const draft = ensureDraft(top.vm);
			if (isEmptyCustomSelected(top.vm, draft)) return;
			if (!(!(top.vm.canCustom && (top.vm.multi ? draft.useCustom : draft.sel === top.vm.options.length)) && !top.vm.multi && top.vm.risk === "high" && draft.sel === 0)) return;
			holdPct = 0;
			clearInterval(holdTimer);
			holdTimer = setInterval(() => {
				if (btnPressMoved) {
					clearInterval(holdTimer);
					holdTimer = null;
					return;
				}
				holdPct += 12.5;
				const bar = document.getElementById("triageBtnProg");
				if (bar) bar.style.width = `${Math.min(100, holdPct)}%`;
				if (holdPct >= 100) {
					clearInterval(holdTimer);
					holdTimer = null;
					if (bar) bar.style.width = "0%";
					navigator.vibrate?.(25);
					confirmTopCard();
				}
			}, 80);
		},
		triageConfirmBtnUp() {
			const wasHolding = Boolean(holdTimer);
			clearInterval(holdTimer);
			holdTimer = null;
			const bar = document.getElementById("triageBtnProg");
			if (bar) bar.style.width = "0%";
			if (btnPressMoved) return;
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			const draft = ensureDraft(top.vm);
			if (isEmptyCustomSelected(top.vm, draft)) {
				nudgeEmptyCustom();
				return;
			}
			if (!(top.vm.canCustom && (top.vm.multi ? draft.useCustom : draft.sel === top.vm.options.length)) && !top.vm.multi && top.vm.risk === "high" && draft.sel === 0) {
				if (wasHolding && holdPct < 100) {
					showDragPill(isEn() ? "🛡️ High-risk: hold for 0.8s to confirm" : "🛡️ 高危操作请按住 0.8 秒确认", "#e11d48", "#ffffff");
					hideDragPill(800);
				}
				return;
			}
			confirmTopCard();
		},
		triageConfirmBtnCancel() {
			clearInterval(holdTimer);
			holdTimer = null;
			const bar = document.getElementById("triageBtnProg");
			if (bar) bar.style.width = "0%";
		},
		toggleTriageModalExpand() {
			setModalExpanded(!modalExpanded);
		},
		closeTriageDetailModal: closeDetailModal,
		openTriagePromptModal() {
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			const en = isEn();
			const { vm, session } = top;
			if (session._wireTruncated || session.omittedTranscriptCount > 0 || session.hasMoreTranscript) deps.hydrateColdSession?.(session.hostId, session.id, session.sessionRev);
			const sigLen = (vm.promptInfo.text || "").length * 8 + (session._wireTruncated ? 1 : 0) + (en ? 4 : 0);
			openModalView({
				title: en ? "💬 My Full Prompt" : "💬 我发送的完整提问",
				bodyHtml: buildPromptModalBodyHtml(top),
				kind: "prompt",
				sessionId: vm.sessionId,
				sigLen,
				defaultExpanded: false
			});
		},
		openTriageFilesModal() {
			const top = getOrderedActiveCards()[0];
			if (!top || !top.vm.diffInfo.files.length) return;
			const en = isEn();
			const { vm } = top;
			const n = vm.diffInfo.files.length;
			const bodyHtml = `<div style="display:flex;flex-direction:column;gap:7px;">
          ${vm.diffInfo.files.map((f) => {
				const enc = encodeURIComponent(f.path || f.name).replace(/'/g, "%27");
				return `<div class="dsh-triage-file-row" onclick="closeTriageDetailModal(); triageInspectSessionFile('${esc(vm.sessionId)}', '${enc}')">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${esc(f.name)}</span>
              <span style="flex-shrink:0;">
                ${vm.diffInfo.hasLineCounts ? `<b style="color:#16a34a">+${f.added}</b> <b style="color:#dc2626">-${f.removed}</b>` : ""}
                <span style="color:#2563eb;margin-left:4px;">${en ? "View ›" : "查看 ›"}</span>
              </span>
            </div>`;
			}).join("")}
        </div>`;
			openModalView({
				title: en ? `📄 Code Changes (${n} file${n === 1 ? "" : "s"})` : `📄 代码改动 (${n} 个文件)`,
				bodyHtml,
				kind: "files",
				sessionId: vm.sessionId,
				defaultExpanded: false
			});
		},
		triageInspectSessionFile(sessionId, encodedPath) {
			deps.openFileForSession?.(sessionId, decodeURIComponent(encodedPath));
		},
		openTriageCommandModal() {
			const top = getOrderedActiveCards()[0];
			if (!top || !top.vm.cmdLine) return;
			const en = isEn();
			const bodyHtml = `
          <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${en ? "Working Dir: " : "执行目录："}<code>${esc(top.session.cwd || "-")}</code></div>
          <pre style="margin:0;padding:13px;border-radius:14px;background:#0f172a;color:#f8fafc;font-family:var(--mono,monospace);font-size:12.5px;line-height:1.58;white-space:pre-wrap;word-break:break-all;">${esc(top.vm.cmdLine)}</pre>
        `;
			openModalView({
				title: en ? "💻 Full Command to Execute" : "💻 待执行完整命令",
				bodyHtml,
				kind: "command",
				sessionId: top.vm.sessionId,
				defaultExpanded: false
			});
		},
		openTriageReplyModal() {
			const top = getOrderedActiveCards()[0];
			if (!top) return;
			const en = isEn();
			const { vm, session } = top;
			if (session._wireTruncated || session.omittedTranscriptCount > 0 || session.hasMoreTranscript) deps.hydrateColdSession?.(session.hostId, session.id, session.sessionRev);
			const sigLen = (vm.fullReplyMarkdown || "").length * 8 + (session._wireTruncated ? 1 : 0) + (en ? 4 : 0);
			openModalView({
				title: en ? "📖 Latest Full AI Reply" : "📖 AI 最新完整回复",
				bodyHtml: buildReplyModalBodyHtml(top),
				kind: "reply",
				sessionId: vm.sessionId,
				sigLen,
				defaultExpanded: false
			});
		}
	});
	return {
		isOpen: () => isOpen,
		getTopSessionId: () => getOrderedActiveCards()[0]?.vm?.sessionId || "",
		getPendingCount: () => getOrderedActiveCards().length,
		onStateUpdated: () => {
			if (isOpen) render({ force: false });
		},
		onLangChanged: () => {
			lastRenderedSig = "";
			syncStaticChromeLang();
			updateUndoBtnDom();
			if (isOpen) render({ force: true });
		}
	};
}
// hub/web/src/controller.js
function initHubController() {
	const urlParams = new URLSearchParams(location.search);
	const queryToken = (urlParams.get("token") || "").trim();
	const queryPairCode = (urlParams.get("pair") || "").trim();
	let pendingDeepLinkHostId = (urlParams.get("host") || "").trim();
	let pendingDeepLinkTaskId = (urlParams.get("task") || urlParams.get("session") || "").trim();
	const hasRecoveryParam = urlParams.has("_r");
	if (queryToken || queryPairCode || pendingDeepLinkHostId || pendingDeepLinkTaskId || hasRecoveryParam) {
		if (queryToken) localStorage.setItem("dsh_hub_token", queryToken);
		urlParams.delete("token");
		urlParams.delete("pair");
		urlParams.delete("host");
		urlParams.delete("task");
		urlParams.delete("session");
		urlParams.delete("_r");
		const cleanSearch = urlParams.toString();
		const cleanUrl = location.pathname + (cleanSearch ? "?" + cleanSearch : "") + location.hash;
		try {
			history.replaceState(null, "", cleanUrl);
		} catch {}
	}
	function getToken() {
		return localStorage.getItem("dsh_hub_token") || "";
	}
	function authHeaders(extra = {}) {
		const tk = getToken();
		const h = {
			"content-type": "application/json",
			...extra
		};
		if (tk) {
			h["authorization"] = "Bearer " + tk;
			h["x-hub-token"] = tk;
		}
		return h;
	}
	let authLockConfirmed = false;
	async function verifyCandidateToken(candidateToken, timeoutMs = 25e3) {
		const ctrl = typeof AbortController === "function" ? new AbortController() : null;
		const timer = ctrl ? setTimeout(() => {
			try {
				ctrl.abort();
			} catch {}
		}, timeoutMs) : null;
		try {
			const headers = { "content-type": "application/json" };
			const tk = String(candidateToken ?? "").trim();
			if (tk) {
				headers["authorization"] = "Bearer " + tk;
				headers["x-hub-token"] = tk;
			}
			const res = await fetch("/api/auth/verify", {
				method: "POST",
				headers,
				body: "{}",
				...ctrl ? { signal: ctrl.signal } : {}
			});
			if (res.status === 401) return {
				ok: false,
				unauthorized: true
			};
			const data = await res.json().catch(() => ({}));
			if (res.ok && data?.ok) return {
				ok: true,
				authRequired: Boolean(data.authRequired)
			};
			return {
				ok: false,
				unauthorized: false,
				error: data?.error || `HTTP ${res.status}`
			};
		} catch (err) {
			return {
				ok: false,
				unauthorized: false,
				error: err && err.name === "AbortError" ? "连接超时，请检查网络后重试" : err?.message || "网络异常"
			};
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
	async function apiFetch(path, options = {}) {
		const sentToken = getToken();
		const res = await fetch(path, {
			...options,
			headers: authHeaders(options.headers || {})
		});
		if (res.status === 401) {
			if (getToken() !== sentToken) throw new Error("Superseded");
			authLockConfirmed = true;
			closeSSE();
			document.getElementById("authOverlay").classList.add("show");
			throw new Error("Unauthorized");
		}
		authLockConfirmed = false;
		document.getElementById("authOverlay").classList.remove("show");
		return res;
	}
	async function submitAuthLogin() {
		const inputEl = document.getElementById("authTokenInput");
		const raw = inputEl.value.trim();
		if (!raw) return;
		const btnEl = document.querySelector("#authOverlay button.primary-block-btn");
		const origBtnText = btnEl ? btnEl.textContent : "";
		if (btnEl) {
			btnEl.disabled = true;
			btnEl.textContent = "⏳ 正在验证解锁...";
		}
		try {
			if (/^[A-Z0-9]{6}$/i.test(raw)) try {
				const exRes = await fetch("/api/pairing/exchange", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ code: raw.toUpperCase() })
				});
				const exData = await exRes.json().catch(() => ({}));
				if (exRes.ok && exData.token) {
					authLockConfirmed = false;
					localStorage.setItem("dsh_hub_token", exData.token);
					document.getElementById("authOverlay").classList.remove("show");
					showToast("🔓 配对解锁成功，正在加载数据...");
					const paired = await fetchState({ forceFresh: true });
					if (!paired.ok && !paired.superseded) {
						setConnectionBanner(true);
						showToast("⚠️ 已解锁，正在同步数据，请稍候…");
					}
					connectSSE();
					return;
				}
				if (exRes.status === 429) {
					showToast("❌ " + (exData.error || "尝试次数过多，请稍后再试"));
					return;
				}
			} catch {}
			const check = await verifyCandidateToken(raw, 25e3);
			if (!check.ok) {
				if (check.unauthorized) {
					localStorage.removeItem("dsh_hub_token");
					authLockConfirmed = true;
					showToast("❌ 访问密码或配对码不正确，请重试");
					document.getElementById("authOverlay").classList.add("show");
					try {
						inputEl.select();
					} catch {}
				} else showToast("❌ 无法连接总控台：" + (check.error || "网络异常"));
				return;
			}
			authLockConfirmed = false;
			localStorage.setItem("dsh_hub_token", raw);
			document.getElementById("authOverlay").classList.remove("show");
			showToast("🔓 解锁成功");
			const state = await fetchState({ forceFresh: true });
			connectSSE();
			if (!state.ok && !state.superseded) {
				if (state.unauthorized) {
					localStorage.removeItem("dsh_hub_token");
					authLockConfirmed = true;
					showToast("❌ 访问密码校验已失效，请重新输入");
					document.getElementById("authOverlay").classList.add("show");
				} else setConnectionBanner(true);
			}
		} finally {
			if (btnEl) {
				btnEl.disabled = false;
				btnEl.textContent = origBtnText;
			}
		}
	}
	function lockAndLogout() {
		localStorage.removeItem("dsh_hub_token");
		authLockConfirmed = true;
		closeSSE();
		document.getElementById("authOverlay").classList.add("show");
		showToast("🔒 已锁定当前浏览器");
	}
	let hubState = {
		hosts: [],
		activeHostId: "",
		migrations: [],
		shares: [],
		pushSubscriptions: []
	};
	let currentHostId = "ALL_HOSTS";
	let currentProject = "ALL";
	let currentTab = "chats";
	let searchQuery = "";
	let activeSessionId = "";
	let desktopStageMode = "chat";
	const overlayStack = [];
	let suppressPopstateCount = 0;
	let lastRenderedChatKey = "";
	let lastRenderedComposerKey = "";
	let lastRenderedChatSessionId = "";
	let lastRenderedStripKey = "";
	let lastRenderedListKey = "";
	let lastRenderedSettingsKey = "";
	let cachedPushStatusText = "";
	let cachedPushStatusColor = "";
	let cachedPushDeviceListText = "";
	let lastAutoPushSyncAt = 0;
	const upgradingHostMap = {};
	const selectedSessionModels = (() => {
		try {
			const raw = localStorage.getItem("dsh_selected_session_models_v1");
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === "object") return parsed;
			}
		} catch {}
		return {};
	})();
	let newTaskModel = "";
	function persistSelectedSessionModels() {
		try {
			localStorage.setItem("dsh_selected_session_models_v1", JSON.stringify(selectedSessionModels));
		} catch {}
	}
	const FALLBACK_MODEL_CATALOG = {
		"antigravity-ide": {
			defaultLabel: "Gemini 4 Argon (High)",
			models: [
				{
					value: "MODEL_PLACEHOLDER_M417",
					label: "Gemini 4 Argon (High)"
				},
				{
					value: "MODEL_PLACEHOLDER_M418",
					label: "Gemini 4 Argon (Medium)"
				},
				{
					value: "MODEL_PLACEHOLDER_M419",
					label: "Gemini 4 Argon (Low)"
				},
				{
					value: "MODEL_PLACEHOLDER_M318",
					label: "Gemini 3.8 Flash (High)"
				},
				{
					value: "MODEL_PLACEHOLDER_M319",
					label: "Gemini 3.8 Flash (Medium)"
				},
				{
					value: "MODEL_PLACEHOLDER_M320",
					label: "Gemini 3.8 Flash (Low)"
				},
				{
					value: "MODEL_PLACEHOLDER_M402",
					label: "Claude Opus 5.5 (High)"
				},
				{
					value: "MODEL_PLACEHOLDER_M401",
					label: "Claude Opus 5.5 (Medium)"
				},
				{
					value: "MODEL_PLACEHOLDER_M400",
					label: "Claude Opus 5.5 (Low)"
				},
				{
					value: "MODEL_PLACEHOLDER_M405",
					label: "Claude Sonnet 5.5 (High)"
				},
				{
					value: "MODEL_PLACEHOLDER_M404",
					label: "Claude Sonnet 5.5 (Medium)"
				},
				{
					value: "MODEL_PLACEHOLDER_M403",
					label: "Claude Sonnet 5.5 (Low)"
				},
				{
					value: "MODEL_OPENAI_GPT_OSS_120B_MEDIUM",
					label: "GPT-OSS 120B (Medium)"
				}
			]
		},
		dsh: {
			defaultLabel: "DeepSeek 默认模型",
			models: [
				{
					value: "deepseek-account::deepseek-flash::high",
					label: "DeepSeek Flash (High 深度思考)"
				},
				{
					value: "deepseek-account::deepseek-flash::medium",
					label: "DeepSeek Flash (Medium 均衡)"
				},
				{
					value: "deepseek-account::deepseek-flash::low",
					label: "DeepSeek Flash (Low 极速)"
				},
				{
					value: "deepseek-account::deepseek-reasoner",
					label: "DeepSeek R1 (Reasoner)"
				},
				{
					value: "deepseek-account::deepseek-chat",
					label: "DeepSeek V3 (Chat)"
				}
			]
		},
		claude: {
			defaultLabel: "Claude Sonnet (默认)",
			models: [
				{
					value: "sonnet",
					label: "Claude Sonnet (均衡推荐)"
				},
				{
					value: "opus",
					label: "Claude Opus (深度推理)"
				},
				{
					value: "haiku",
					label: "Claude Haiku (极速轻量)"
				}
			]
		},
		codex: {
			defaultLabel: "GPT-5.5 (默认)",
			models: [
				{
					value: "gpt-5.5",
					label: "GPT-5.5"
				},
				{
					value: "gpt-5.4",
					label: "GPT-5.4"
				},
				{
					value: "gpt-5.4-mini",
					label: "GPT-5.4-Mini"
				},
				{
					value: "gpt-5.3-codex",
					label: "GPT-5.3-Codex"
				},
				{
					value: "o3",
					label: "o3 (深度推理)"
				},
				{
					value: "o4-mini",
					label: "o4-mini (快速)"
				}
			]
		},
		workbuddy: {
			defaultLabel: "DeepSeek V3.1 (WorkBuddy 默认)",
			models: [
				{
					value: "deepseek-v3.1",
					label: "DeepSeek V3.1 (WorkBuddy)"
				},
				{
					value: "claude-sonnet-4-6",
					label: "Claude Sonnet 4.6"
				},
				{
					value: "gpt-5.4",
					label: "GPT-5.4"
				},
				{
					value: "gemini-2.5-pro",
					label: "Gemini 2.5 Pro"
				},
				{
					value: "hunyuan-turbos",
					label: "Hunyuan TurboS"
				}
			]
		}
	};
	function getHarnessModelCatalog(host, harness = "dsh") {
		const hKey = harness || "dsh";
		const remoteCat = host?.bridgeState?.modelCatalog?.[hKey];
		const fallback = FALLBACK_MODEL_CATALOG[hKey] || FALLBACK_MODEL_CATALOG.dsh;
		if (remoteCat && Array.isArray(remoteCat.models) && remoteCat.models.length > 0) return {
			defaultModel: remoteCat.defaultModel || "",
			defaultLabel: remoteCat.defaultLabel || fallback.defaultLabel,
			models: remoteCat.models
		};
		return fallback;
	}
	function resolveModelShortLabel(catalog, modelVal, sessionModel = "") {
		const raw = String(modelVal || sessionModel || "").trim();
		if (raw) {
			const hit = (catalog?.models || []).find((m) => m.value === raw || m.label === raw || m.value.endsWith(`::${raw}`)) || (FALLBACK_MODEL_CATALOG["antigravity-ide"]?.models || []).find((m) => m.value === raw || m.label === raw);
			if (hit) return hit.label;
			const cleanParts = raw.split("::");
			if (cleanParts.length >= 2) return cleanParts[1] + (cleanParts[2] ? ` (${cleanParts[2]})` : "");
			if (!raw.startsWith("MODEL_PLACEHOLDER_")) return raw;
		}
		return catalog?.defaultLabel || "默认模型";
	}
	function updateChatModelPill(session, host) {
		const btn = document.getElementById("chatModelBtn");
		const labelEl = document.getElementById("chatModelBtnLabel");
		if (!btn || !labelEl || !session) return;
		const isObserveOnly = session.controlMode === "observe-only" && session.harness !== "dsh";
		btn.style.display = isObserveOnly ? "none" : "";
		if (isObserveOnly) return;
		const catalog = getHarnessModelCatalog(host, session.harness);
		const overrideVal = selectedSessionModels[session.id] || "";
		labelEl.textContent = `🤖 ${resolveModelShortLabel(catalog, overrideVal, session.model)}`;
		btn.classList.toggle("active-override", Boolean(overrideVal));
	}
	function cleanModelHumanLabel(rawLabel) {
		let s = String(rawLabel || "").trim();
		if (!s) return "默认模型";
		s = s.replace(/\([^)]*-[0-9]{4,}[^)]*\)/g, "").trim();
		s = s.replace(/\(\s*\)/g, "").trim();
		let tierSuffix = "";
		const parenMatch = s.match(/\(([^)]+)\)\s*$/);
		if (parenMatch) {
			const tierHit = parenMatch[1].trim().match(/^(High|Medium|Low|Thinking|Fast|Mini|Pro)\b/i);
			if (tierHit) {
				const rawTier = tierHit[1];
				tierSuffix = ` (${rawTier.charAt(0).toUpperCase()}${rawTier.slice(1).toLowerCase()})`;
			}
			s = s.slice(0, parenMatch.index).trim();
		}
		if (/^deepseek\s*默认模型$/i.test(s)) return "DeepSeek";
		const combined = `${s}${tierSuffix}`.trim();
		return combined.length > 26 ? `${combined.slice(0, 24)}…` : combined;
	}
	function updateNewTaskModelPill() {
		const labelEl = document.getElementById("newTaskModelBtnLabel");
		if (!labelEl) return;
		const cleanLabel = cleanModelHumanLabel(resolveModelShortLabel(getHarnessModelCatalog((hubState.hosts || []).find((h) => h.hostId === newTaskHostId), newTaskHarness), newTaskModel, ""));
		labelEl.textContent = newTaskModel ? `🤖 ${cleanLabel}` : `🤖 默认 · ${cleanLabel}`;
	}
	function openModelPickerSheet(target = "chat") {
		let host = null;
		let harness = "dsh";
		let currentSelected = "";
		let sessionDefault = "";
		if (target === "newTask") {
			host = (hubState.hosts || []).find((h) => h.hostId === newTaskHostId) || (hubState.hosts || [])[0];
			harness = newTaskHarness || "antigravity-ide";
			currentSelected = newTaskModel || "";
		} else {
			const found = findSessionGlobal(activeSessionId);
			if (!found) return;
			host = found.host;
			harness = found.session.harness || "dsh";
			currentSelected = selectedSessionModels[found.session.id] || "";
			sessionDefault = found.session.model || "";
		}
		const catalog = getHarnessModelCatalog(host, harness);
		const inheritedLabel = resolveModelShortLabel(catalog, "", sessionDefault);
		const titleEl = document.getElementById("modelPickerTitle");
		if (titleEl) titleEl.textContent = `🤖 选择模型 · ${harness === "antigravity-ide" ? "⚡ Antigravity IDE" : harness === "claude" ? "✴️ Claude Code" : harness === "codex" ? "🧠 OpenAI Codex" : harness === "workbuddy" ? "🐼 WorkBuddy" : "🟣 DeepSeek Harness"}`;
		const bodyEl = document.getElementById("modelPickerBody");
		if (!bodyEl) return;
		bodyEl.innerHTML = [{
			value: "",
			label: `✨ 跟随电脑端当前默认 (${inheritedLabel})`,
			sub: "不强制覆盖，沿用该会话在电脑端已选的模型配置"
		}, ...(catalog.models || []).map((m) => ({
			value: m.value,
			label: m.label,
			sub: m.value.includes("::") ? m.value.replace(/::/g, " · ") : m.value
		}))].map((opt) => {
			const isSel = opt.value === currentSelected;
			return `
            <div class="host-option ${isSel ? "selected" : ""}" onclick="selectModelFromPicker('${esc$1(target)}', '${esc$1(opt.value)}')">
              <div style="min-width:0;flex:1;">
                <div style="font-size:14px;font-weight:700;color:var(--text);">${esc$1(opt.label)}</div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(opt.sub)}</div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${isSel ? "var(--primary)" : "var(--muted)"};margin-left:8px;flex-shrink:0;">
                ${isSel ? "当前已选 ✓" : "选择 ›"}
              </span>
            </div>
          `;
		}).join("");
		openSheet("modelPickerSheet");
	}
	function selectModelFromPicker(target, modelValue) {
		const val = String(modelValue || "").trim();
		if (target === "newTask") {
			newTaskModel = val;
			updateNewTaskModelPill();
		} else if (activeSessionId) {
			if (val) selectedSessionModels[activeSessionId] = val;
			else delete selectedSessionModels[activeSessionId];
			persistSelectedSessionModels();
			const found = findSessionGlobal(activeSessionId);
			if (found) updateChatModelPill(found.session, found.host);
		}
		closeSheet("modelPickerSheet");
		showToast(val ? "🤖 已切换模型，下条指令将立即生效" : "✨ 已恢复跟随电脑端默认模型");
	}
	function clearHomeScreenAppBadge() {
		try {
			if (navigator && typeof navigator.clearAppBadge === "function") navigator.clearAppBadge().catch(() => {});
			if (navigator && typeof navigator.setAppBadge === "function") navigator.setAppBadge(0).catch(() => {});
			if (navigator && navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration === "function") navigator.serviceWorker.getRegistration().then((reg) => reg && typeof reg.getNotifications === "function" ? reg.getNotifications() : []).then((list) => {
				for (const n of list || []) try {
					n.close();
				} catch {}
			}).catch(() => {});
		} catch {}
	}
	let themePref = localStorage.getItem("dsh_theme_pref") || "system";
	function applyTheme(pref = themePref) {
		themePref = pref || "system";
		const root = document.documentElement;
		if (themePref === "dark") root.setAttribute("data-theme", "dark");
		else if (themePref === "light") root.setAttribute("data-theme", "light");
		else root.removeAttribute("data-theme");
		const isDarkEffective = themePref === "dark" || themePref === "system" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
		const metaTheme = document.querySelector("meta[name=\"theme-color\"]");
		if (metaTheme) metaTheme.setAttribute("content", isDarkEffective ? "#0f172a" : "#ffffff");
	}
	function setThemePreference(nextPref) {
		try {
			localStorage.setItem("dsh_theme_pref", nextPref);
		} catch {}
		applyTheme(nextPref);
		lastRenderedSettingsKey = "";
		renderAll();
	}
	applyTheme(themePref);
	let langPref = getLangPref();
	function setLangPreference$1(nextLang) {
		langPref = setLangPreference(nextLang);
		lastRenderedChatKey = "";
		lastRenderedComposerKey = "";
		lastRenderedStripKey = "";
		lastRenderedListKey = "";
		lastRenderedSettingsKey = "";
		triageCtrl?.onLangChanged?.();
		renderAll();
		applyLangToDom(document.body, langPref);
	}
	function toggleLangPreference() {
		setLangPreference$1(langPref === "en" ? "zh" : "en");
	}
	setTimeout(() => applyLangToDom(document.body, langPref), 0);
	let pinnedMap = {};
	let seenMap = {};
	let seenSigMap = {};
	let triageCtrl = null;
	let addHostPanelExpanded = false;
	let expandedHostCardIds = {};
	try {
		pinnedMap = JSON.parse(localStorage.getItem("dsh_pinned_v4") || "{}");
	} catch {}
	try {
		seenMap = JSON.parse(localStorage.getItem("dsh_seen_v4") || "{}");
	} catch {}
	try {
		seenSigMap = JSON.parse(localStorage.getItem("dsh_seen_sig_v1") || "{}");
	} catch {}
	function syncSessionReadToServer(sessionId, sig, at) {
		if (!sessionId) return;
		hubState.sessionReadState = hubState.sessionReadState || {};
		hubState.sessionReadState[sessionId] = {
			unread: false,
			sig: String(sig || ""),
			at: Number(at) || Date.now()
		};
		apiFetch("/api/sessions/read", {
			method: "POST",
			body: JSON.stringify({
				sessionId,
				sig: String(sig || ""),
				at: Number(at) || Date.now()
			})
		}).catch(() => {});
	}
	function dismissLiveBanner() {
		renderSessionList();
	}
	if ((localStorage.getItem("dsh_preview_mode") || "phone") === "desktop") {
		document.body.classList.remove("PhoneFrameMode");
		document.body.classList.add("DesktopSplitMode");
		document.getElementById("btnPhoneMode")?.classList.remove("active");
		document.getElementById("btnDesktopMode")?.classList.add("active");
	}
	function setPreviewMode(mode) {
		const isPhone = mode === "phone";
		localStorage.setItem("dsh_preview_mode", mode);
		document.body.classList.toggle("PhoneFrameMode", isPhone);
		document.body.classList.toggle("DesktopSplitMode", !isPhone);
		document.getElementById("btnPhoneMode")?.classList.toggle("active", isPhone);
		document.getElementById("btnDesktopMode")?.classList.toggle("active", !isPhone);
		if (isPhone && desktopStageMode === "code") switchDesktopStage("chat");
		if (!isPhone && !activeSessionId) {
			const first = getNormalizedSessions()[0];
			if (first) {
				activeSessionId = first.id;
				first.hostId;
			}
		}
		renderAll();
	}
	let fileProjectCwd = "";
	let fileLoading = null;
	let filePreviewLoading = null;
	const pinnedDrawerPreviewByHost = {};
	const pinnedMainPreviewByHost = {};
	let actionTargetSession = null;
	let actionTargetHostId = "";
	let confirmSheetDelete = false;
	let newTaskHostId = "";
	let newTaskCwd = "";
	let newTaskHarness = "dsh";
	let migSource = "";
	let migTarget = "";
	let migSwitchFeishu = true;
	let migWipeSource = false;
	function showToast(msg) {
		const el = document.getElementById("toastPill");
		if (!el) return;
		el.textContent = langPref === "en" ? translateZhStringToEn(String(msg || "")) : msg;
		const vvOffsetTop = Number(window.visualViewport?.offsetTop || 0);
		if (vvOffsetTop > 4) el.style.top = `${Math.round(vvOffsetTop + 14)}px`;
		else el.style.top = "";
		el.classList.add("show");
		clearTimeout(window.__toastTimer);
		window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
	}
	const expandedTranscriptBySession = /* @__PURE__ */ new Map();
	const hydratedWireTranscriptBySession = /* @__PURE__ */ new Map();
	const hydratingWireSessionIds = /* @__PURE__ */ new Set();
	const OPT_MSGS_STORAGE_KEY = "dsh_optimistic_msgs_v1";
	function ensureOptimisticMsgsMap() {
		if (!window.__dshOptimisticMsgs) try {
			const raw = sessionStorage.getItem(OPT_MSGS_STORAGE_KEY);
			window.__dshOptimisticMsgs = raw ? JSON.parse(raw) || {} : {};
		} catch {
			window.__dshOptimisticMsgs = {};
		}
		return window.__dshOptimisticMsgs;
	}
	function persistOptimisticMsgsMap() {
		try {
			sessionStorage.setItem(OPT_MSGS_STORAGE_KEY, JSON.stringify(window.__dshOptimisticMsgs || {}));
		} catch {}
	}
	function matchesOptimisticUserText(msgText, opt) {
		const m = String(msgText || "").trim();
		if (!m) return false;
		const full = String((typeof opt === "object" ? opt?.text : opt) || "").trim();
		const raw = String((typeof opt === "object" ? opt?.rawText || opt?.text : opt) || "").trim();
		return Boolean(full && m === full || raw && (m === raw || m.startsWith(`${raw}\n`)));
	}
	function hasOptimisticSyncedToWire(wireTranscript, serverTotalCount, opt) {
		if (!Array.isArray(wireTranscript) || wireTranscript.length === 0) return false;
		let sameCount = 0;
		let lastMatchIdx = -1;
		for (let i = 0; i < wireTranscript.length; i += 1) {
			const m = wireTranscript[i];
			if (m && m.role === "user" && matchesOptimisticUserText(m.text, opt)) {
				sameCount += 1;
				lastMatchIdx = i;
			}
		}
		if (lastMatchIdx < 0) return false;
		const baseSame = typeof opt?.baselineSameUserCount === "number" ? opt.baselineSameUserCount : 0;
		const baseTotal = typeof opt?.baselineTotalCount === "number" ? opt.baselineTotalCount : 0;
		if (baseSame === 0) return true;
		if (sameCount > baseSame) return true;
		if (serverTotalCount > baseTotal && lastMatchIdx >= Math.max(0, wireTranscript.length - 3)) return true;
		return false;
	}
	function getNormalizedSessions() {
		const list = [];
		const optMap = ensureOptimisticMsgsMap();
		let optMapDirty = false;
		const isChatOpenNow = document.getElementById("chatFullscreen")?.classList.contains("open") || document.body.classList.contains("DesktopSplitMode");
		for (const h of hubState.hosts || []) {
			if (currentHostId && currentHostId !== "ALL_HOSTS" && h.hostId !== currentHostId) continue;
			const tasks = h.bridgeState?.tasks || [];
			const localSettling = window.__dshSettlingApprovals || {};
			const approvals = (h.bridgeState?.approvals || []).map((a) => {
				if (a?.code && localSettling[a.code] && Date.now() - localSettling[a.code].at < 45e3 && !a.lastError) return {
					...a,
					settling: true,
					settlingDecision: localSettling[a.code].decision
				};
				return a;
			});
			for (const t of tasks) {
				if (t?.isSubagent || t?.origin === "subagent" || t?.parentConversationId) continue;
				if (String(t?.harness || "") === "antigravity-ide" && Array.isArray(t?.transcript) && t.transcript.length > 0 && !t.transcript.some((m) => m?.role === "user")) continue;
				if (/^workbuddy:\d+$/.test(String(t?.id || "").trim()) && (!Array.isArray(t?.transcript) || t.transcript.length === 0) && !(Number(t?.messageCount) > 0) && t?.status !== "running" && t?.status !== "approval" && !t?.pendingApproval) continue;
				const ts = t.updatedAt || t.lastActivity || 0;
				const pendingApp = approvals.find((a) => a.agentId === t.id);
				const rawWireTranscript = Array.isArray(t.transcript) ? [...t.transcript] : [];
				const hydratedWire = hydratedWireTranscriptBySession.get(t.id);
				let wireTranscript = rawWireTranscript;
				if (hydratedWire && Array.isArray(hydratedWire.transcript) && hydratedWire.transcript.length >= rawWireTranscript.length && (!t.sessionRev || !hydratedWire.sessionRev || hydratedWire.sessionRev === t.sessionRev)) {
					if (t.status !== "running" && t.status !== "approval") wireTranscript = [...hydratedWire.transcript];
					else if (hydratedWire.transcript.length > rawWireTranscript.length) {
						if (rawWireTranscript.length === 0) wireTranscript = [...hydratedWire.transcript];
						else {
							const firstLive = rawWireTranscript[0];
							const matchIdx = hydratedWire.transcript.findIndex((m) => m && m.role === firstLive?.role && String(m.text || "").slice(0, 80) === String(firstLive?.text || "").slice(0, 80));
							if (matchIdx > 0) wireTranscript = [...hydratedWire.transcript.slice(0, matchIdx), ...rawWireTranscript];
							else {
								const extraCount = Math.max(0, hydratedWire.transcript.length - rawWireTranscript.length);
								wireTranscript = [...hydratedWire.transcript.slice(0, extraCount), ...rawWireTranscript];
							}
						}
					}
				}
				const serverWireTotalCount = Math.max(Number(t.totalTranscriptCount) || 0, Number(t.messageCount) || 0, wireTranscript.length);
				const expandedEntry = expandedTranscriptBySession.get(t.id);
				let baseTranscript = [...wireTranscript];
				if (expandedEntry && Array.isArray(expandedEntry.transcript) && expandedEntry.transcript.length > wireTranscript.length) {
					if (wireTranscript.length === 0) baseTranscript = [...expandedEntry.transcript];
					else {
						const firstWire = wireTranscript[0];
						const matchIdx = expandedEntry.transcript.findIndex((m) => m && m.role === firstWire?.role && String(m.text || "").slice(0, 80) === String(firstWire?.text || "").slice(0, 80));
						if (matchIdx > 0) baseTranscript = [...expandedEntry.transcript.slice(0, matchIdx), ...wireTranscript];
						else {
							const lastExp = expandedEntry.transcript[expandedEntry.transcript.length - 1];
							const tailIdxInWire = lastExp ? wireTranscript.findIndex((m) => m && m.role === lastExp.role && String(m.text || "").slice(0, 80) === String(lastExp.text || "").slice(0, 80)) : -1;
							if (tailIdxInWire >= 0 && tailIdxInWire < wireTranscript.length - 1) baseTranscript = [...expandedEntry.transcript, ...wireTranscript.slice(tailIdxInWire + 1)];
							else {
								const extraCount = Math.max(0, expandedEntry.transcript.length - wireTranscript.length);
								baseTranscript = [...expandedEntry.transcript.slice(0, extraCount), ...wireTranscript];
							}
						}
					}
				}
				const pendingPromptCmds = (h.pendingCommands || []).filter((c) => c && c.agentId === t.id && (c.type === "prompt" || c.type === "steer"));
				const inflightPromptCmds = (h.inflightCommands || []).filter((c) => c && c.agentId === t.id && (c.type === "prompt" || c.type === "steer"));
				const isHostOnlineNow = h.online !== false && h.activelyConnected !== false;
				const queuedCmds = pendingPromptCmds.filter((c) => c.queued || !isHostOnlineNow);
				const dispatchingCmds = pendingPromptCmds.filter((c) => !c.queued && isHostOnlineNow);
				const expiredCmds = (h.recentResults || []).filter((r) => r && r.expired && (r.type === "prompt" || r.type === "steer") && r.agentId === t.id && r.text);
				const cancelledOrFailedIds = new Set((h.recentResults || []).filter((r) => r && r.id && (r.cancelled || r.ok === false)).map((r) => r.id));
				const optimisticList = optMap[t.id] || [];
				const nowMs = Date.now();
				const remainingOpt = [];
				const renderedOptItems = [];
				for (const opt of optimisticList) {
					if (!opt || nowMs - opt.time >= 6e4) {
						optMapDirty = true;
						continue;
					}
					if (opt.cmdId && cancelledOrFailedIds.has(opt.cmdId) || hasOptimisticSyncedToWire(wireTranscript, serverWireTotalCount, opt) || expiredCmds.some((ec) => opt.cmdId && ec.id === opt.cmdId || matchesOptimisticUserText(ec.text, opt))) {
						optMapDirty = true;
						continue;
					}
					remainingOpt.push(opt);
					if (queuedCmds.some((qc) => opt.cmdId && qc.id === opt.cmdId || matchesOptimisticUserText(qc.text, opt))) continue;
					renderedOptItems.push(opt);
					baseTranscript.push({
						role: "user",
						text: opt.text,
						time: opt.time,
						optId: opt.id
					});
				}
				for (const dc of [...dispatchingCmds, ...inflightPromptCmds]) {
					const alreadyRendered = renderedOptItems.some((opt) => opt.cmdId && dc.id && opt.cmdId === dc.id || matchesOptimisticUserText(dc.text, opt));
					const alreadySynced = hasOptimisticSyncedToWire(wireTranscript, serverWireTotalCount, {
						text: dc.text,
						rawText: dc.text,
						baselineSameUserCount: typeof dc.baselineSameCount === "number" ? dc.baselineSameCount : 0,
						baselineTotalCount: typeof dc.baselineTotalCount === "number" ? dc.baselineTotalCount : 0
					});
					if (!alreadyRendered && !alreadySynced) {
						renderedOptItems.push({
							cmdId: dc.id || "",
							text: dc.text,
							rawText: dc.text
						});
						baseTranscript.push({
							role: "user",
							text: dc.text,
							time: dc.createdAt || nowMs
						});
					}
				}
				for (const ec of expiredCmds) if (nowMs - (ec.at || 0) <= 18e5) baseTranscript.push({
					role: "user",
					text: ec.text,
					time: ec.createdAt || ec.at || nowMs,
					expiredCmdId: ec.id,
					expiredError: ec.error || "电脑超过 10 分钟未上线，该指令已超时未执行"
				});
				for (const qc of queuedCmds) baseTranscript.push({
					role: "user",
					text: qc.text,
					time: qc.createdAt || nowMs,
					queuedCmdId: qc.id,
					expiresAt: qc.expiresAt || 0
				});
				if (optMap[t.id]) {
					if (remainingOpt.length > 0) optMap[t.id] = remainingOpt;
					else {
						delete optMap[t.id];
						optMapDirty = true;
					}
				}
				const transcript = baseTranscript;
				const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;
				const project = t.project || (t.cwd ? t.cwd.split("/").filter(Boolean).pop() : "默认工作区") || "默认工作区";
				const hasActiveInflight = isHostOnlineNow && (dispatchingCmds.length > 0 || inflightPromptCmds.length > 0 || renderedOptItems.length > 0);
				const status = pendingApp ? "approval" : t.status === "running" || hasActiveInflight ? "running" : t.status || "idle";
				const queuedCount = queuedCmds.length;
				const rawIdStr = String(t.id || "");
				const harness = t.harness || (rawIdStr.startsWith("agy-ide:") ? "antigravity-ide" : rawIdStr.startsWith("codex:") ? "codex" : rawIdStr.startsWith("workbuddy:") ? "workbuddy" : rawIdStr.startsWith("doubao:") ? "doubao" : rawIdStr.startsWith("claude:") ? "claude" : "dsh");
				const harnessLabel = t.harnessLabel || (harness === "antigravity-ide" ? "Antigravity IDE" : harness === "codex" ? "Codex" : harness === "workbuddy" ? "WorkBuddy" : harness === "doubao" ? "豆包电脑版" : harness === "claude" ? "Claude Code" : "DeepSeek Harness");
				let lastConclusionAt = Number(t.lastConclusionAt) || 0;
				if (!lastConclusionAt && status === "idle" && lastMsg?.role === "assistant" && Boolean(lastMsg?.text)) lastConclusionAt = ts;
				const lastInterruptedAt = Number(t.lastInterruptedAt) || 0;
				const turnState = status === "approval" ? "approval" : status === "running" ? "running" : t.turnState === "interrupted" ? "interrupted" : t.turnState === "conclusion" || lastConclusionAt > 0 ? "conclusion" : "idle";
				const rawPreview = status === "running" ? t.runningSummary || t.lastOutput || lastMsg?.text || "正在思考与执行任务..." : status === "approval" ? pendingApp?.promptTitle || pendingApp?.reason || t.lastOutput || "等待你批准工具执行" : t.lastOutput || lastMsg?.text || t.cwd || "点击查看对话详情";
				const changedFiles = Array.isArray(t.changedFiles) ? t.changedFiles : Array.isArray(pendingApp?.changedFiles) ? pendingApp.changedFiles : [];
				const artifacts = Array.isArray(t.artifacts) ? t.artifacts : Array.isArray(pendingApp?.artifacts) ? pendingApp.artifacts : [];
				const totalTranscriptCount = Math.max(Number(t.totalTranscriptCount) || 0, Number(t.messageCount) || 0, transcript.length);
				const omittedTranscriptCount = expandedEntry ? 0 : Math.max(0, Number(t.omittedTranscriptCount) || totalTranscriptCount - wireTranscript.length);
				const cleanPrev = cleanPreviewText(String(rawPreview || "").slice(0, 360)) || "点击查看对话详情";
				const msgCountVal = totalTranscriptCount || transcript.length || 0;
				const conclusionSig = `${turnState}:${msgCountVal}:${cleanPrev.slice(0, 80)}`;
				list.push({
					id: t.id,
					hostId: h.hostId,
					hostName: h.hostName || h.hostId,
					harness,
					harnessLabel,
					controlMode: t.controlMode || "managed",
					capabilities: t.capabilities || null,
					stateMeta: t.stateMeta || null,
					sessionRev: t.sessionRev || "",
					title: t.title || "未命名会话",
					project,
					cwd: t.cwd || "",
					status,
					turnState,
					lastConclusionAt,
					lastInterruptedAt,
					conclusionSig,
					approvalObj: pendingApp || null,
					changedFiles,
					artifacts,
					queuedCount,
					msgCount: msgCountVal,
					totalTranscriptCount,
					omittedTranscriptCount,
					hasMoreTranscript: Boolean(omittedTranscriptCount > 0 || t.hasMoreTranscript && !expandedEntry),
					updatedAt: ts,
					timeLabel: formatTime(ts),
					pinned: Boolean(pinnedMap[t.id]),
					unread: false,
					hasUnreadConclusion: false,
					isUnreadInterrupted: false,
					isRecentActive: false,
					lastRole: lastMsg?.role || "assistant",
					lastPreview: cleanPrev,
					rawLastPreview: rawPreview,
					transcript,
					_wireTranscript: wireTranscript,
					_wireTotalCount: serverWireTotalCount,
					_wireTruncated: Boolean(t.wireTruncated && wireTranscript === rawWireTranscript)
				});
			}
		}
		if (optMapDirty) persistOptimisticMsgsMap();
		const sortedByTime = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
		let seenDirty = false;
		const serverReadMap = hubState.sessionReadState || {};
		sortedByTime.forEach((s) => {
			const srvRead = serverReadMap[s.id];
			if (srvRead && !srvRead.unread) {
				if (srvRead.at && (!seenMap[s.id] || srvRead.at > seenMap[s.id])) {
					seenMap[s.id] = srvRead.at;
					seenDirty = true;
				}
				if (srvRead.sig && seenSigMap[s.id] !== srvRead.sig && (!seenMap[s.id] || srvRead.at >= seenMap[s.id])) {
					seenSigMap[s.id] = srvRead.sig;
					seenDirty = true;
				}
			}
			if (s.id === activeSessionId && isChatOpenNow) {
				const maxTs = Math.max(seenMap[s.id] || 0, s.updatedAt || 0, s.lastConclusionAt || 0);
				if (seenMap[s.id] !== maxTs || s.turnState === "conclusion" && seenSigMap[s.id] !== s.conclusionSig) {
					seenMap[s.id] = maxTs;
					if (s.turnState === "conclusion") {
						seenSigMap[s.id] = s.conclusionSig;
						if (!srvRead || srvRead.unread || srvRead.sig !== s.conclusionSig) syncSessionReadToServer(s.id, s.conclusionSig, maxTs);
					}
					seenDirty = true;
				}
			}
			if (s.status === "running" || s.status === "approval") {
				if (!seenMap[s.id]) {
					seenMap[s.id] = s.lastConclusionAt || 1;
					seenDirty = true;
				}
				s.hasUnreadConclusion = false;
				s.isUnreadInterrupted = false;
				s.unread = false;
				return;
			}
			if (!seenMap[s.id]) {
				if (srvRead?.unread && s.turnState === "conclusion" && s.id !== activeSessionId) seenMap[s.id] = Math.max(1, (s.lastConclusionAt || s.updatedAt || 2) - 1e3);
				else {
					seenMap[s.id] = Math.max(s.updatedAt || 0, s.lastConclusionAt || 0, Date.now());
					if (s.turnState === "conclusion") seenSigMap[s.id] = s.conclusionSig;
				}
				seenDirty = true;
			}
			const seenAt = Number(seenMap[s.id]) || 0;
			const seenSig = String(seenSigMap[s.id] || "");
			const isCurrentOpen = s.id === activeSessionId && isChatOpenNow;
			const serverSaysUnread = Boolean(srvRead?.unread && s.conclusionSig !== seenSig);
			s.hasUnreadConclusion = !isCurrentOpen && s.turnState === "conclusion" && s.conclusionSig !== seenSig && (serverSaysUnread || s.lastConclusionAt > 0 && s.lastConclusionAt > seenAt);
			s.isUnreadInterrupted = !isCurrentOpen && s.turnState === "interrupted" && (s.lastInterruptedAt || s.updatedAt) > seenAt;
			s.unread = s.hasUnreadConclusion || s.isUnreadInterrupted;
		});
		if (seenDirty) try {
			localStorage.setItem("dsh_seen_v4", JSON.stringify(seenMap));
			localStorage.setItem("dsh_seen_sig_v1", JSON.stringify(seenSigMap));
		} catch {}
		return sortNormalizedSessions(list);
	}
	function findSessionGlobal(sessionId) {
		const prevHost = currentHostId;
		currentHostId = "ALL_HOSTS";
		const all = getNormalizedSessions();
		currentHostId = prevHost;
		const found = all.find((s) => s.id === sessionId);
		if (!found) return null;
		return {
			session: found,
			host: (hubState.hosts || []).find((h) => h.hostId === found.hostId)
		};
	}
	function formatHostTelemetry(host) {
		const sys = host?.bridgeState?.systemTelemetry || host?.systemTelemetry || null;
		const power = sys?.power || null;
		const net = sys?.network || null;
		const isOnline = Boolean(host && host.online !== false && host.activelyConnected !== false);
		const powerIcon = power?.icon || (power?.hasBattery ? "🔋" : "🔌");
		const powerShort = power?.shortLabel || (power?.hasBattery && power?.percent != null ? `${power.percent}%` : power ? "电源直供" : "供电正常");
		const powerDetail = power?.label || (power ? powerShort : "供电正常");
		const netIcon = net?.icon || "📶";
		const rttStr = net?.rttMs ? `${net.rttMs}ms` : "";
		const netShort = net?.shortLabel || `${net?.kindLabel || "网络"}${rttStr ? ` ${rttStr}` : ""}`;
		const netDetail = net?.label || `${net?.kindLabel || "在线"}${net?.localIp ? ` (${net.localIp})` : ""}${rttStr ? ` · ${rttStr}` : ""}`;
		const lowBattery = Boolean(power?.lowBattery);
		const slowNet = Boolean(net?.rttMs && net.rttMs > 600);
		return {
			hasTelemetry: Boolean(sys),
			isOnline,
			lowBattery,
			slowNet,
			powerIcon,
			powerShort,
			powerDetail,
			netIcon,
			netShort,
			netDetail,
			compactBadge: `${powerIcon} ${powerShort} · ${netIcon} ${netShort}`,
			fullLine: `${powerIcon} ${powerDetail} · ${netIcon} ${netDetail}`
		};
	}
	function getHostProjects(host) {
		if (!host) return [];
		const map = /* @__PURE__ */ new Map();
		for (const w of host.bridgeState?.workspaces || []) if (w.cwd) {
			const name = w.name || w.cwd.split("/").filter(Boolean).pop() || w.cwd;
			map.set(name, w.cwd);
		}
		for (const t of host.bridgeState?.tasks || []) if (t.cwd) {
			const name = t.project || t.cwd.split("/").filter(Boolean).pop() || t.cwd;
			if (!map.has(name)) map.set(name, t.cwd);
		}
		if (map.size === 0) map.set("默认工作区", "");
		return [...map.entries()].map(([name, cwd]) => ({
			name,
			cwd
		}));
	}
	function renderAll() {
		const hosts = hubState.hosts || [];
		if (!currentHostId || currentHostId !== "ALL_HOSTS" && !hosts.some((h) => h.hostId === currentHostId)) currentHostId = hubState.activeHostId && hosts.some((h) => h.hostId === hubState.activeHostId) ? hubState.activeHostId : hosts[0]?.hostId || "ALL_HOSTS";
		const totalSessions = hosts.reduce((acc, h) => acc + (h.bridgeState?.tasks || []).length, 0);
		const currentHostObj = hosts.find((h) => h.hostId === currentHostId);
		const dotEl = document.getElementById("topHostDot");
		if (Boolean(getToken()) && !authLockConfirmed && !hasLoadedInitialState && hosts.length === 0) {
			dotEl.className = "status-dot";
			document.getElementById("topHostName").textContent = "正在同步设备…";
		} else if (hosts.length === 0) {
			dotEl.className = "status-dot offline";
			document.getElementById("topHostName").textContent = "未接入电脑 (0)";
		} else if (currentHostId === "ALL_HOSTS") {
			dotEl.className = "status-dot" + (hosts.some((h) => h.online) ? "" : " offline");
			document.getElementById("topHostName").textContent = hosts.length <= 1 && hosts[0] ? `${hosts[0].hostName} (${totalSessions})` : `全部电脑 (${totalSessions})`;
		} else if (currentHostObj) {
			dotEl.className = "status-dot" + (currentHostObj.online ? "" : " offline");
			document.getElementById("topHostName").textContent = `${currentHostObj.hostName} (${(currentHostObj.bridgeState?.tasks || []).length})`;
		}
		const turboBtn = document.getElementById("turboBadgeBtn");
		if (turboBtn) {
			const turbo = (currentHostObj || hosts.find((h) => h.online) || hosts[0])?.bridgeState?.turbo;
			if (turbo?.enabled && turbo?.accessibilityGranted !== false) {
				turboBtn.textContent = turbo.engine === "rust-native" ? "🦀 极速实时" : "⚡ 极速实时";
				turboBtn.style.background = "#ecfdf5";
				turboBtn.style.color = "#059669";
				turboBtn.style.borderColor = "#a7f3d0";
			} else if (turbo?.enabled && turbo?.accessibilityGranted === false) {
				turboBtn.textContent = "⚠️ 需开权限";
				turboBtn.style.background = "#fffbeb";
				turboBtn.style.color = "#d97706";
				turboBtn.style.borderColor = "#fde68a";
			} else {
				turboBtn.textContent = "🚀 点此提速";
				turboBtn.style.background = "#eff6ff";
				turboBtn.style.color = "#2563eb";
				turboBtn.style.borderColor = "#bfdbfe";
			}
		}
		const searchBox = document.getElementById("searchAndFilterBox");
		const normalizedSessions = getNormalizedSessions();
		if (currentTab === "chats") {
			searchBox.style.display = hosts.length === 0 ? "none" : "block";
			renderProjectStrip(normalizedSessions);
			renderSessionList(normalizedSessions);
		} else if (currentTab === "files") {
			searchBox.style.display = "none";
			renderFilesTab(document.getElementById("mainViewport"));
		} else {
			searchBox.style.display = "none";
			renderSettingsTab();
		}
		if (desktopStageMode === "code") renderFilePanes();
		if (activeSessionId) renderActiveChatStage();
		else if (window.innerWidth >= 769 && document.body.classList.contains("DesktopSplitMode")) {
			const first = normalizedSessions[0];
			if (first) {
				activeSessionId = first.id;
				first.hostId;
				renderActiveChatStage();
			}
		}
		if (document.getElementById("inChatFileSheet").classList.contains("open")) renderInChatFileDrawerBody();
		triageCtrl?.onStateUpdated();
		applyLangToDom(document.body, langPref);
	}
	function renderProjectStrip(sessionsArg) {
		const sessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
		const triageCount = sessions.filter(isTriageEligibleSession).length;
		const activeCount = sessions.filter((s) => s.status === "running" || s.status === "approval").length;
		const unreadCount = sessions.filter((s) => s.hasUnreadConclusion || s.isUnreadInterrupted).length;
		const agyCount = sessions.filter((s) => s.harness === "antigravity-ide").length;
		const codexCount = sessions.filter((s) => s.harness === "codex").length;
		const workbuddyCount = sessions.filter((s) => s.harness === "workbuddy").length;
		const doubaoCount = sessions.filter((s) => s.harness === "doubao").length;
		const claudeCount = sessions.filter((s) => s.harness === "claude").length;
		const dshCount = sessions.filter((s) => s.harness === "dsh").length;
		const counts = {};
		for (const s of sessions) counts[s.project] = (counts[s.project] || 0) + 1;
		const projects = Object.keys(counts);
		const strip = document.getElementById("projectStrip");
		const nowDate = /* @__PURE__ */ new Date();
		const stripKey = `${`${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()}`}:${currentProject}:${sessions.length}:${triageCount}:${activeCount}:${unreadCount}:${agyCount}:${codexCount}:${workbuddyCount}:${doubaoCount}:${claudeCount}:${dshCount}:${projects.map((p) => `${p}:${counts[p]}`).join(",")}`;
		if (stripKey === lastRenderedStripKey && strip.children.length > 0) return;
		lastRenderedStripKey = stripKey;
		const prevScrollLeft = strip.scrollLeft;
		const smartPills = [`<button class="filter-pill smart-pill ${currentProject === "SMART_ACTIVE" ? "active" : ""}" onclick="selectProject('SMART_ACTIVE')">🟢 运行中 <span class="count">${activeCount}</span></button>`, `<button class="filter-pill smart-pill ${currentProject === "SMART_UNREAD" ? "active" : ""}" onclick="selectProject('SMART_UNREAD')">🔵 已出结论 <span class="count">${unreadCount}</span></button>`];
		if (agyCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_AGY_IDE" ? "active" : ""}" onclick="selectProject('HARNESS_AGY_IDE')">${renderHarnessBadgeHtml("antigravity-ide", "pill")} IDE <span class="count">${agyCount}</span></button>`);
		if (codexCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_CODEX" ? "active" : ""}" onclick="selectProject('HARNESS_CODEX')">${renderHarnessBadgeHtml("codex", "pill")} Codex <span class="count">${codexCount}</span></button>`);
		if (workbuddyCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_WORKBUDDY" ? "active" : ""}" onclick="selectProject('HARNESS_WORKBUDDY')">${renderHarnessBadgeHtml("workbuddy", "pill")} WorkBuddy <span class="count">${workbuddyCount}</span></button>`);
		if (doubaoCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_DOUBAO" ? "active" : ""}" onclick="selectProject('HARNESS_DOUBAO')">${renderHarnessBadgeHtml("doubao", "pill")} 豆包 <span class="count">${doubaoCount}</span></button>`);
		if (claudeCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_CLAUDE" ? "active" : ""}" onclick="selectProject('HARNESS_CLAUDE')">${renderHarnessBadgeHtml("claude", "pill")} Claude <span class="count">${claudeCount}</span></button>`);
		if (dshCount > 0 && (agyCount > 0 || codexCount > 0 || workbuddyCount > 0 || doubaoCount > 0 || claudeCount > 0)) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_DSH" ? "active" : ""}" onclick="selectProject('HARNESS_DSH')">${renderHarnessBadgeHtml("dsh", "pill")} DSH <span class="count">${dshCount}</span></button>`);
		strip.innerHTML = [
			`<button type="button" class="triage-grid-entry-btn" id="triageGridEntryBtn" title="滑卡批阅模式" aria-label="滑卡批阅模式" onclick="openTriageDeckMode()"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1.5" y="1.5" width="5.2" height="5.2" rx="1.4"/><rect x="9.3" y="1.5" width="5.2" height="5.2" rx="1.4"/><rect x="1.5" y="9.3" width="5.2" height="5.2" rx="1.4"/><rect x="9.3" y="9.3" width="5.2" height="5.2" rx="1.4"/></svg>${triageCount > 0 ? "<span class=\"triage-grid-dot\"></span>" : ""}</button>`,
			`<button class="filter-pill ${currentProject === "ALL" ? "active" : ""}" onclick="selectProject('ALL')">全部 <span class="count">${sessions.length}</span></button>`,
			...smartPills,
			...projects.map((p) => `<button class="filter-pill ${currentProject === p ? "active" : ""}" title="${esc$1(p)}" onclick="selectProject('${esc$1(p)}')">${esc$1(formatCompactProjectLabel(p, nowDate))} <span class="count">${counts[p]}</span></button>`)
		].join("");
		strip.scrollLeft = prevScrollLeft;
	}
	function renderSessionList(sessionsArg) {
		const viewport = document.getElementById("mainViewport");
		const allSessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
		const nowDate = /* @__PURE__ */ new Date();
		const todayKey = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()}`;
		let pendingAppInfo = null;
		const localSettling = window.__dshSettlingApprovals || {};
		for (const h of hubState.hosts || []) {
			if (h.online === false) continue;
			if (currentHostId && currentHostId !== "ALL_HOSTS" && h.hostId !== currentHostId) continue;
			const appRaw = (h.bridgeState?.approvals || [])[0];
			if (appRaw) {
				pendingAppInfo = {
					app: appRaw.code && localSettling[appRaw.code] && Date.now() - localSettling[appRaw.code].at < 45e3 && !appRaw.lastError ? {
						...appRaw,
						settling: true,
						settlingDecision: localSettling[appRaw.code].decision
					} : appRaw,
					host: h
				};
				break;
			}
		}
		const q = searchQuery.trim().toLowerCase();
		const filtered = allSessions.filter((s) => {
			if (currentProject === "SMART_ACTIVE" && s.status !== "running" && s.status !== "approval") return false;
			if (currentProject === "SMART_UNREAD" && !s.hasUnreadConclusion && !s.isUnreadInterrupted) return false;
			if (currentProject === "HARNESS_DSH" && s.harness !== "dsh") return false;
			if (currentProject === "HARNESS_AGY_IDE" && s.harness !== "antigravity-ide") return false;
			if (currentProject === "HARNESS_CODEX" && s.harness !== "codex") return false;
			if (currentProject === "HARNESS_WORKBUDDY" && s.harness !== "workbuddy") return false;
			if (currentProject === "HARNESS_DOUBAO" && s.harness !== "doubao") return false;
			if (currentProject === "HARNESS_CLAUDE" && s.harness !== "claude") return false;
			if (![
				"ALL",
				"SMART_ACTIVE",
				"SMART_UNREAD",
				"HARNESS_DSH",
				"HARNESS_AGY_IDE",
				"HARNESS_CODEX",
				"HARNESS_WORKBUDDY",
				"HARNESS_DOUBAO",
				"HARNESS_CLAUDE"
			].includes(currentProject) && s.project !== currentProject) return false;
			if (!q) return true;
			const compactProj = formatCompactProjectLabel(s.project, nowDate).toLowerCase();
			return s.title.toLowerCase().includes(q) || s.project.toLowerCase().includes(q) || compactProj.includes(q) || s.lastPreview.toLowerCase().includes(q);
		});
		const showHostTag = currentHostId === "ALL_HOSTS" && (hubState.hosts || []).length > 1;
		const shortHostMap = showHostTag ? buildShortHostNameMap(hubState.hosts || []) : {};
		const isPendingQuestion = Boolean(pendingAppInfo && (pendingAppInfo.app.kind === "question" || Array.isArray(pendingAppInfo.app.questions)));
		let step6Dismissed = false;
		try {
			step6Dismissed = localStorage.getItem("dsh_step6_qr_dismissed") === "1";
		} catch {}
		const showStep6Banner = (hubState.hosts || []).length > 0 && !step6Dismissed;
		const bannerKey = pendingAppInfo ? `${pendingAppInfo.host.hostId}:${pendingAppInfo.app.code}:${pendingAppInfo.app.kind || ""}:${pendingAppInfo.app.promptTitle || ""}:${pendingAppInfo.app.settling ? 1 : 0}:${pendingAppInfo.app.lastError || ""}` : "";
		const hostsSig = (hubState.hosts || []).map((h) => `${h.hostId}:${h.hostName || ""}`).join(",");
		const rowsSig = filtered.map((s) => `${s.id}:${s.harness}:${s.status}:${s.approvalObj?.kind || ""}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ""}:${s.queuedCount || 0}:${s.hasUnreadConclusion ? 1 : 0}:${s.isUnreadInterrupted ? 1 : 0}:${s.pinned ? 1 : 0}:${s.id === activeSessionId ? 1 : 0}:${s.title}:${s.project}:${s.lastRole}:${s.lastPreview}:${s.timeLabel}`).join("|");
		const isInitialSyncPending = Boolean(getToken()) && !authLockConfirmed && !hasLoadedInitialState && (hubState.hosts || []).length === 0;
		const enrollSig = `${hubState.enrollment?.code || ""}:${hubState.enrollment?.joinedCount || 0}:${isInitialSyncPending ? "sync" : "ready"}`;
		const listKey = `${todayKey}:${hostsSig}:${allSessions.length}:${currentProject}:${q}:${showHostTag ? 1 : 0}:${showStep6Banner ? 1 : 0}:${enrollSig}:${bannerKey}#${rowsSig}`;
		if (listKey === lastRenderedListKey && viewport.querySelector(".session-list")) return;
		lastRenderedListKey = listKey;
		const prevScrollTop = viewport.scrollTop;
		const step6BannerHtml = showStep6Banner ? `
        <div class="step6-onboarding-banner" style="margin:10px 12px 4px;padding:10px 12px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="min-width:0;flex:1;font-size:12.5px;color:var(--text);line-height:1.45;">
            🎉 <strong>电脑已接入！第 ⑥ 步</strong>：点右侧生成二维码，用<strong>手机相机扫一扫</strong>即可免输密码直接遥控
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button class="pill-action-btn primary" style="padding:5px 10px;font-size:12px;" onclick="openPairingCodeSheet()">📱 手机扫码登录</button>
            <button class="pill-action-btn" style="padding:4px 8px;font-size:12px;color:var(--muted);" title="关闭提示" onclick="dismissStep6QrBanner()">✕</button>
          </div>
        </div>
      ` : "";
		const liveBannerHtml = pendingAppInfo ? `
        <div class="live-activity-bar">
          <div class="live-activity-left" onclick="openChat('${esc$1(pendingAppInfo.app.agentId)}')">
            <div class="live-activity-title">${isPendingQuestion ? "💬" : "⏳"} [${esc$1(pendingAppInfo.host.hostName)}] ${esc$1(pendingAppInfo.app.project ? `${formatCompactProjectLabel(pendingAppInfo.app.project, nowDate)} / ` : "")}${esc$1(pendingAppInfo.app.settling ? isPendingQuestion ? "正在同步你的选择到电脑端..." : "正在同步审批到电脑端..." : pendingAppInfo.app.title || (isPendingQuestion ? "等待你做出选择" : "等待你批准工具执行"))}</div>
            <div class="live-activity-desc" ${pendingAppInfo.app.lastError ? "style=\"color:#ef4444;font-weight:600;\"" : ""}>${esc$1(pendingAppInfo.app.lastError ? `⚠️ ${pendingAppInfo.app.lastError}` : pendingAppInfo.app.promptTitle || pendingAppInfo.app.reason || "")}</div>
          </div>
          <div class="live-activity-actions">
            ${pendingAppInfo.app.settling ? `
              <button class="mini-approve-btn" disabled style="opacity:0.65;cursor:not-allowed;">⏳ 处理中...</button>
            ` : isPendingQuestion ? `
              <button class="mini-approve-btn" onclick="openChat('${esc$1(pendingAppInfo.app.agentId)}')">去选择 ›</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc$1(pendingAppInfo.host.hostId)}', '${esc$1(pendingAppInfo.app.code)}', false, 4, '${esc$1(pendingAppInfo.app.agentId || "")}')">跳过</button>
            ` : `
              <button class="mini-approve-btn" onclick="sendApprovalDecision('${esc$1(pendingAppInfo.host.hostId)}', '${esc$1(pendingAppInfo.app.code)}', true, 1, '${esc$1(pendingAppInfo.app.agentId || "")}')">✓ 允许</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc$1(pendingAppInfo.host.hostId)}', '${esc$1(pendingAppInfo.app.code)}', false, 4, '${esc$1(pendingAppInfo.app.agentId || "")}')">拒绝</button>
            `}
          </div>
        </div>
      ` : "";
		const rowsHtml = filtered.map((s) => {
			let rowStateClass = "";
			let statusHtml = `<span class="session-time">${esc$1(s.timeLabel)}</span>`;
			if (s.status === "approval") {
				rowStateClass = "row-state-approval";
				const isRowQuestion = Boolean(s.approvalObj && (s.approvalObj.kind === "question" || Array.isArray(s.approvalObj.questions)));
				statusHtml = s.approvalObj?.settling ? `<span class="badge-approval">⏳ 同步电脑中...</span>` : s.approvalObj?.lastError ? `<span class="badge-interrupted">⚠️ ${isRowQuestion ? "选择待重试" : "审批待重试"}</span>` : `<span class="badge-approval">⏳ ${isRowQuestion ? "待你选择" : "待你授权"}</span>`;
			} else if (s.queuedCount > 0) statusHtml = `<span class="badge-approval" style="background:var(--amber-soft);color:#b45309;">⏳ ${s.queuedCount} 条排队</span>`;
			else if (s.status === "running") {
				rowStateClass = "row-state-running";
				statusHtml = `<span class="badge-running">● 运行中</span>`;
			} else if (s.hasUnreadConclusion) {
				rowStateClass = "row-state-conclusion";
				statusHtml = `<span class="badge-conclusion">🔵 已出结论</span>`;
			} else if (s.isUnreadInterrupted) {
				rowStateClass = "row-state-interrupted";
				statusHtml = `<span class="badge-interrupted">⚠️ 中断待继续</span>`;
			}
			const pinHtml = s.pinned ? `<span class="pin-tag" title="已置顶">📌</span>` : "";
			const shortHostLabel = shortHostMap[s.hostId] || s.hostName;
			const hostBadgeHtml = showHostTag ? `<span class="host-mini-tag" title="${esc$1(s.hostName)}">${esc$1(shortHostLabel)}</span>` : "";
			const harnessBadgeHtml = renderHarnessBadgeHtml(s.harness, "row", s.harnessLabel);
			const compactProject = formatCompactProjectLabel(s.project, nowDate);
			const rolePrefix = s.status === "running" ? "" : s.lastRole === "user" ? "🧑 我: " : "🤖 ";
			const displayTitle = stripRedundantProjectPrefix(s.title, s.project);
			return `
          <div class="session-row ${rowStateClass} ${s.pinned ? "pinned-row" : ""} ${s.id === activeSessionId ? "selected-desktop" : ""}" onclick="openChat('${esc$1(s.id)}')">
            <div class="session-main">
              <div class="session-top-line">
                <div class="session-title-wrap">
                  ${pinHtml}
                  <div class="session-title">${esc$1(displayTitle)}</div>
                </div>
                <div class="session-right-meta">${statusHtml}</div>
              </div>
              <div class="session-sub-line">
                ${harnessBadgeHtml}
                ${hostBadgeHtml}
                <span class="project-mini-tag" title="${esc$1(s.project)}">📁 ${esc$1(compactProject)}</span>
                <span class="session-preview-text">${rolePrefix}${esc$1(s.lastPreview)}</span>
              </div>
            </div>
            <button class="row-more-btn" title="更多操作" onclick="event.stopPropagation(); openSessionActions('${esc$1(s.id)}')">⋯</button>
          </div>
        `;
		}).join("");
		let emptyStateHtml = "";
		if (!rowsHtml) {
			const hostsCount = (hubState.hosts || []).length;
			if (isInitialSyncPending) emptyStateHtml = `
            <div style="padding:48px 20px;text-align:center;">
              <div style="font-size:28px;margin-bottom:10px;">⚡</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">正在同步在线电脑与会话列表…</div>
              <div style="font-size:12.5px;color:var(--muted);">已通过安全校验，正在拉取实时任务快照</div>
            </div>
          `;
			else if (hostsCount === 0) emptyStateHtml = renderAddHostPanelHtml({ isEmptyState: true });
			else if (allSessions.length === 0) emptyStateHtml = `
            <div style="padding:40px 20px;text-align:center;">
              <div style="font-size:30px;margin-bottom:8px;">✨</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">电脑已接入，还没有对话记录</div>
              <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">你可以直接在远程电脑上启动第一个任务，或点击「手机扫码登录」在手机上打开</div>
              <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
                <button class="pill-action-btn primary" onclick="openNewTaskSheet()">＋ 新建远程对话</button>
                <button class="pill-action-btn" onclick="openPairingCodeSheet()">📱 手机扫码登录</button>
              </div>
            </div>
          `;
			else emptyStateHtml = `
            <div style="padding:44px 20px;text-align:center;">
              <div style="font-size:14px;color:var(--muted);margin-bottom:12px;">🔍 暂无匹配的对话记录</div>
              <button class="pill-action-btn" onclick="resetSessionFilters()">↺ 清除筛选条件</button>
            </div>
          `;
		}
		viewport.innerHTML = `
        ${liveBannerHtml}
        ${step6BannerHtml}
        <div class="session-list">
          ${rowsHtml || emptyStateHtml}
        </div>
      `;
		viewport.scrollTop = prevScrollTop;
	}
	function dismissStep6QrBanner() {
		try {
			localStorage.setItem("dsh_step6_qr_dismissed", "1");
		} catch {}
		lastRenderedListKey = "";
		renderSessionList();
	}
	function resetSessionFilters() {
		currentProject = "ALL";
		clearSearch();
		renderProjectStrip();
		renderSessionList();
	}
	let chatPaintSyncTimer = null;
	let chatPinnedToBottom = true;
	let programmaticChatScrollUntil = 0;
	let lastUserUpwardGestureAt = 0;
	let lastChatScrollTop = 0;
	const lastFirstMsgSigBySession = /* @__PURE__ */ new Map();
	const optimisticPreviewImagesByOptId = /* @__PURE__ */ new Map();
	function parseUserMessageAndMedia(m) {
		let raw = String(m?.text || "").trim();
		const reqMatch = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(raw);
		if (reqMatch) raw = reqMatch[1].trim();
		else raw = raw.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, "").trim();
		const mediaItems = [];
		const seenPaths = /* @__PURE__ */ new Set();
		const pushDiskMedia = (primaryPath, backupPath = "", rawLabel = "") => {
			const cleanPrimary = String(primaryPath || "").replace(/^file:\/\//i, "").trim();
			const cleanBackup = String(backupPath || "").replace(/^file:\/\//i, "").trim();
			const mainPath = cleanPrimary || cleanBackup;
			if (!mainPath || seenPaths.has(mainPath)) return;
			seenPaths.add(mainPath);
			const fallbackName = mainPath.split("/").filter(Boolean).pop() || "image.jpg";
			mediaItems.push({
				label: String(rawLabel || fallbackName).trim() || fallbackName,
				primaryPath: mainPath,
				backupPath: cleanPrimary && cleanBackup && cleanBackup !== cleanPrimary ? cleanBackup : ""
			});
		};
		raw = raw.replace(/\[手机端上传图片附件\s*\(\d+\s*张\)[^\]]*\]:?([\s\S]*)$/i, (_full, tail) => {
			const lines = String(tail || "").split("\n");
			for (const ln of lines) {
				const labelMatch = /\(([^()]+\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))\)\s*:/i.exec(ln);
				const primaryMatch = /:\s*(\/[^\s()]+?\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))/i.exec(ln);
				const backupMatch = /备用路径:\s*(\/[^\s()]+?\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))/i.exec(ln);
				if (primaryMatch?.[1] || backupMatch?.[1]) pushDiskMedia(primaryMatch?.[1] || "", backupMatch?.[1] || "", labelMatch?.[1] || "");
			}
			return "";
		});
		const optImgs = m?.optId ? optimisticPreviewImagesByOptId.get(m.optId) : null;
		let pendingRemoteImgCount = 0;
		raw = raw.replace(/\[🖼️\s*已附带\s*(\d+)\s*张截图\]/g, (_m, n) => {
			pendingRemoteImgCount += Number(n) || 1;
			return "";
		});
		for (const med of [...Array.isArray(m?.media) ? m.media : [], ...Array.isArray(m?.images) ? m.images : []]) if (typeof med === "string") pushDiskMedia(med);
		else if (med?.uri || med?.path) pushDiskMedia(med.uri || med.path, "", med.name || "");
		return {
			text: raw.replace(/\n{3,}/g, "\n\n").trim(),
			mediaItems,
			optImgs: Array.isArray(optImgs) && optImgs.length > 0 ? optImgs : null,
			pendingRemoteImgCount: (!optImgs || optImgs.length === 0) && mediaItems.length === 0 ? pendingRemoteImgCount : 0
		};
	}
	function pinChatToBottomImmediate(boxEl = null) {
		const box = boxEl || document.getElementById("chatMessages");
		if (!box) return;
		programmaticChatScrollUntil = Date.now() + 150;
		const maxTop = Math.max(0, box.scrollHeight - box.clientHeight);
		box.scrollTop = maxTop;
		if (maxTop > 1) {
			box.scrollTop = maxTop - 1;
			box.scrollTop = maxTop;
		} else {
			box.style.transform = "translateZ(0.01px)";
			box.offsetHeight;
			box.style.transform = "translateZ(0)";
		}
		lastChatScrollTop = box.scrollTop;
		setScrollBottomVisible(false);
	}
	function scheduleChatPaintAndScrollSync(targetSessionId) {
		const flushOnce = () => {
			if (activeSessionId !== targetSessionId || !chatPinnedToBottom) return;
			const box = document.getElementById("chatMessages");
			if (!box) return;
			pinChatToBottomImmediate(box);
		};
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => {
			flushOnce();
			requestAnimationFrame(flushOnce);
		});
		if (chatPaintSyncTimer) clearTimeout(chatPaintSyncTimer);
		chatPaintSyncTimer = setTimeout(() => {
			chatPaintSyncTimer = null;
			flushOnce();
		}, 265);
	}
	let chatTouchDownAt = 0;
	let pendingChatRenderAfterTouch = false;
	function isDesktopSplitLayout() {
		return typeof window !== "undefined" && window.innerWidth >= 769 && document.body.classList.contains("DesktopSplitMode");
	}
	function openChat(sessionId) {
		const found = findSessionGlobal(sessionId);
		if (!found) return;
		activeSessionId = found.session.id;
		found.session.hostId;
		const readTs = Math.max(found.session.updatedAt || 0, found.session.lastConclusionAt || 0, Date.now());
		seenMap[activeSessionId] = readTs;
		if (found.session.conclusionSig) seenSigMap[activeSessionId] = found.session.conclusionSig;
		try {
			localStorage.setItem("dsh_seen_v4", JSON.stringify(seenMap));
			localStorage.setItem("dsh_seen_sig_v1", JSON.stringify(seenSigMap));
		} catch {}
		syncSessionReadToServer(activeSessionId, found.session.conclusionSig || "", readTs);
		clearHomeScreenAppBadge();
		const chatEl = document.getElementById("chatFullscreen");
		if (chatEl) {
			chatEl.style.transition = "";
			chatEl.style.transform = "";
			chatEl.style.willChange = "";
			chatEl.style.boxShadow = "";
			chatEl.classList.add("open");
		}
		document.body.classList.add("mobile-chat-open");
		artifactsExpandedSessionIds.delete(found.session.id);
		filesExpandedSessionIds.delete(found.session.id);
		chatPinnedToBottom = true;
		lastRenderedChatKey = "";
		renderActiveChatStage(found);
		scheduleChatPaintAndScrollSync(found.session.id);
		if (found.session._wireTruncated && !expandedTranscriptBySession.has(found.session.id)) hydrateColdSessionTranscript(found.session.hostId, found.session.id, found.session.sessionRev || "");
		const box = document.getElementById("chatMessages");
		if (box && box.scrollHeight - box.scrollTop - box.clientHeight >= 120) setScrollBottomVisible(true);
		if (!isDesktopSplitLayout()) {
			trackOverlay("chat", rawCloseChat);
			maybeShowSwipeHint();
		}
		const nextSessions = getNormalizedSessions();
		renderProjectStrip(nextSessions);
		renderSessionList(nextSessions);
	}
	function rawCloseChat() {
		stopVoiceInput();
		stopAssistantSpeech();
		artifactsExpandedSessionIds.clear();
		filesExpandedSessionIds.clear();
		document.getElementById("chatFullscreen").classList.remove("open");
		document.body.classList.remove("mobile-chat-open");
		setScrollBottomVisible(false);
		triageCtrl?.onStateUpdated();
	}
	function closeMobileChat() {
		dismissOverlay("chat", rawCloseChat);
	}
	function closeMobileFile() {
		closeSheet("inChatFileSheet");
		document.body.classList.remove("mobile-file-open");
	}
	let selectedAgyOptionIndex = 1;
	let lastRenderedAssistantTexts = {};
	async function copyAssistantReply(msgIdx, btnEl) {
		const text = String(lastRenderedAssistantTexts?.[msgIdx] || "").trim();
		if (!text) {
			showToast("⚠️ 暂无可复制的回复内容");
			return;
		}
		if (await copyText(text, {
			successMessage: `📋 已复制完整回复（${text.length} 字）`,
			title: "📋 复制 AI 回复全文"
		}) && btnEl) {
			const origHtml = btnEl.dataset.origLabel || btnEl.innerHTML;
			btnEl.dataset.origLabel = origHtml;
			btnEl.classList.add("copied");
			btnEl.innerHTML = "✅ 已复制全文";
			setTimeout(() => {
				btnEl.classList.remove("copied");
				btnEl.innerHTML = origHtml;
			}, 1800);
		}
	}
	async function copyLatestAssistantReply(btnEl) {
		const keys = Object.keys(lastRenderedAssistantTexts || {}).map((k) => Number(k)).filter((n) => Number.isFinite(n)).sort((a, b) => b - a);
		if (!keys.length) {
			showToast("⚠️ 当前对话暂无 AI 回复可复制");
			return;
		}
		await copyAssistantReply(keys[0], btnEl);
	}
	const SPEECH_RATES = [
		1,
		1.25,
		1.5
	];
	const activeSpeechState = {
		playing: false,
		sessionId: "",
		msgIdx: -1,
		mode: typeof localStorage !== "undefined" && localStorage.getItem("dsh_tts_mode_v2") === "concise" ? "concise" : "full",
		rate: (() => {
			const saved = typeof localStorage !== "undefined" ? Number(localStorage.getItem("dsh_tts_rate")) : 1;
			return SPEECH_RATES.includes(saved) ? saved : 1;
		})(),
		hasDistinctSummary: false,
		fullSpokenText: "",
		docLang: "zh",
		segmentBaseOffset: 0,
		segmentStartedAt: 0,
		segmentRate: 1,
		boundaryCharOffset: -1,
		boundaryUpdatedAt: 0,
		runId: 0,
		pinnedUtterances: [],
		watchdogTimer: null,
		handoffTimer: null,
		wakeLock: null
	};
	if (typeof window !== "undefined") {
		window.__dshPinnedUtterances = activeSpeechState.pinnedUtterances;
		if (window.speechSynthesis) try {
			window.speechSynthesis.getVoices();
			window.speechSynthesis.addEventListener?.("voiceschanged", () => {
				try {
					window.speechSynthesis.getVoices();
				} catch {}
			});
		} catch {}
	}
	function releaseSpeechRuntimeHandles() {
		if (activeSpeechState.handoffTimer) {
			clearTimeout(activeSpeechState.handoffTimer);
			activeSpeechState.handoffTimer = null;
		}
		if (activeSpeechState.watchdogTimer) {
			clearInterval(activeSpeechState.watchdogTimer);
			activeSpeechState.watchdogTimer = null;
		}
		activeSpeechState.pinnedUtterances.length = 0;
		if (typeof window !== "undefined") window.__dshPinnedUtterances = activeSpeechState.pinnedUtterances;
		if (activeSpeechState.wakeLock) {
			const wl = activeSpeechState.wakeLock;
			activeSpeechState.wakeLock = null;
			try {
				wl.release?.()?.catch?.(() => {});
			} catch {}
		}
	}
	async function acquireSpeechWakeLock(expectedRunId) {
		if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return;
		try {
			const wl = await navigator.wakeLock.request("screen");
			if (!activeSpeechState.playing || activeSpeechState.runId !== expectedRunId) {
				try {
					await wl.release?.();
				} catch {}
				return;
			}
			activeSpeechState.wakeLock = wl;
		} catch {}
	}
	function renderAssistantFooterHtml(sessionId, msgIdx, cleanReplyText, { isTruncatedPreview = false } = {}) {
		const speakControlsHtml = activeSpeechState.playing && activeSpeechState.sessionId === sessionId && activeSpeechState.msgIdx === msgIdx ? `<button type="button" class="assistant-copy-btn assistant-speak-btn speaking" onclick="stopAssistantSpeech()">⏹ 停止</button>` + (activeSpeechState.hasDistinctSummary ? `<button type="button" class="assistant-copy-btn assistant-speak-sub-btn" onclick="switchAssistantSpeechMode(${msgIdx})" title="切换重点摘要 / 完整去噪">${activeSpeechState.mode === "concise" ? "⚡ 重点" : "📖 全文"}</button>` : "") + `<button type="button" class="assistant-copy-btn assistant-speak-sub-btn" onclick="cycleAssistantSpeechRate(${msgIdx})" title="切换播报倍速">${activeSpeechState.rate}x</button>` : `<button type="button" class="assistant-copy-btn assistant-speak-btn" onclick="toggleSpeakAssistantReply(${msgIdx})">🔊 播报</button>`;
		const charMetaText = isTruncatedPreview ? "全文同步中…" : `共 ${cleanReplyText.length} 字`;
		return `<div class="assistant-copy-footer" data-footer-session-id="${esc$1(sessionId)}" data-footer-msg-idx="${msgIdx}"><button type="button" class="assistant-copy-btn" onclick="copyAssistantReply(${msgIdx}, this)">📋 复制全文</button>${speakControlsHtml}<span class="assistant-char-meta">${charMetaText}</span></div>`;
	}
	function syncSpeechFooterDom() {
		if (typeof document === "undefined") return;
		document.querySelectorAll(".assistant-copy-footer[data-footer-msg-idx]").forEach((el) => {
			const mIdx = Number(el.getAttribute("data-footer-msg-idx"));
			const sessId = el.getAttribute("data-footer-session-id") || activeSessionId || "";
			const rawText = String(lastRenderedAssistantTexts?.[mIdx] || "").trim();
			if (!rawText) return;
			const tmp = document.createElement("div");
			tmp.innerHTML = renderAssistantFooterHtml(sessId, mIdx, rawText);
			const nextEl = tmp.firstElementChild;
			if (!nextEl) return;
			if (getLangPref() === "en") applyLangToDom(nextEl, "en");
			el.replaceWith(nextEl);
		});
	}
	function stopAssistantSpeech() {
		activeSpeechState.runId += 1;
		const wasPlaying = activeSpeechState.playing;
		activeSpeechState.playing = false;
		activeSpeechState.sessionId = "";
		activeSpeechState.msgIdx = -1;
		activeSpeechState.fullSpokenText = "";
		activeSpeechState.segmentBaseOffset = 0;
		activeSpeechState.segmentStartedAt = 0;
		activeSpeechState.boundaryCharOffset = -1;
		activeSpeechState.boundaryUpdatedAt = 0;
		releaseSpeechRuntimeHandles();
		try {
			if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused)) window.speechSynthesis.cancel();
		} catch {}
		if (wasPlaying) syncSpeechFooterDom();
	}
	function startAssistantSpeech(msgIdx, { startOffset = 0, _recoveryDepth = 0 } = {}) {
		if (typeof window === "undefined" || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
			showToast("⚠️ 当前浏览器暂不支持系统语音播报");
			return;
		}
		const rawText = String(lastRenderedAssistantTexts?.[msgIdx] || "").trim();
		if (!rawText) {
			showToast("⚠️ 暂无可播报的回复内容");
			return;
		}
		if (isVoiceRecording()) stopVoiceInput();
		const prepared = prepareSpeechScript(rawText);
		const fullSpokenText = activeSpeechState.mode === "concise" && prepared.hasDistinctSummary ? prepared.conciseText : prepared.fullText;
		if (!fullSpokenText) {
			showToast("⚠️ 暂无可播报的回复内容");
			return;
		}
		const effectiveOffset = startOffset > 0 ? snapToCleanSpeechOffset(fullSpokenText, startOffset) : 0;
		const remainingText = effectiveOffset > 0 && effectiveOffset < fullSpokenText.length ? fullSpokenText.slice(effectiveOffset) : fullSpokenText;
		const actualBaseOffset = effectiveOffset > 0 && effectiveOffset < fullSpokenText.length ? effectiveOffset : 0;
		const myRunId = ++activeSpeechState.runId;
		releaseSpeechRuntimeHandles();
		const synth = window.speechSynthesis;
		const wasSynthBusy = Boolean(synth.speaking || synth.pending || synth.paused);
		if (wasSynthBusy) try {
			synth.cancel();
		} catch {}
		const nowMs = Date.now();
		activeSpeechState.playing = true;
		activeSpeechState.sessionId = activeSessionId || "";
		activeSpeechState.msgIdx = msgIdx;
		activeSpeechState.hasDistinctSummary = prepared.hasDistinctSummary;
		activeSpeechState.fullSpokenText = fullSpokenText;
		activeSpeechState.docLang = prepared.docLang;
		activeSpeechState.segmentBaseOffset = actualBaseOffset;
		activeSpeechState.segmentStartedAt = nowMs;
		activeSpeechState.segmentRate = activeSpeechState.rate;
		activeSpeechState.boundaryCharOffset = -1;
		activeSpeechState.boundaryUpdatedAt = 0;
		syncSpeechFooterDom();
		acquireSpeechWakeLock(myRunId);
		const chosenVoice = pickBestBrowserVoice(synth.getVoices() || [], prepared.docLang);
		const isAppleWebKit = isIosDevice() || /AppleWebKit/i.test(navigator.userAgent || "") && !/Chrome|Chromium|Edg/i.test(navigator.userAgent || "");
		const chunks = splitIntoContinuousBrowserChunks(remainingText, isAppleWebKit);
		let runningChunkOffset = actualBaseOffset;
		const chunkDescriptors = chunks.map((chunkText) => {
			const posInFull = fullSpokenText.indexOf(chunkText, runningChunkOffset);
			const resolvedChunkBase = posInFull >= 0 ? posInFull : runningChunkOffset;
			runningChunkOffset = resolvedChunkBase + chunkText.length;
			return {
				text: chunkText,
				baseOffset: resolvedChunkBase
			};
		});
		let currentChunkIdx = -1;
		let currentAdvanceFn = null;
		let lastChunkStartAt = Date.now();
		let lastSynthBusyAt = Date.now();
		let errorSkipCount = 0;
		const finishSpeechPlayback = () => {
			if (activeSpeechState.runId !== myRunId) return;
			activeSpeechState.playing = false;
			activeSpeechState.sessionId = "";
			activeSpeechState.msgIdx = -1;
			releaseSpeechRuntimeHandles();
			syncSpeechFooterDom();
		};
		const findNextSentenceOffset = (fromCharOffset) => {
			const tail = fullSpokenText.slice(Math.max(0, fromCharOffset));
			const m = /[。！？.!?\n]+\s*/.exec(tail);
			if (!m) return -1;
			const candidate = Math.max(0, fromCharOffset) + m.index + m[0].length;
			return candidate < fullSpokenText.length - 2 ? candidate : -1;
		};
		const speakChunkAt = (idx) => {
			if (activeSpeechState.runId !== myRunId || !activeSpeechState.playing) return;
			if (idx >= chunkDescriptors.length) {
				finishSpeechPlayback();
				return;
			}
			currentChunkIdx = idx;
			const desc = chunkDescriptors[idx];
			const chunkNow = Date.now();
			lastChunkStartAt = chunkNow;
			lastSynthBusyAt = chunkNow;
			activeSpeechState.segmentBaseOffset = desc.baseOffset;
			activeSpeechState.segmentStartedAt = chunkNow;
			activeSpeechState.segmentRate = activeSpeechState.rate;
			activeSpeechState.boundaryCharOffset = desc.baseOffset;
			activeSpeechState.boundaryUpdatedAt = chunkNow;
			const u = new SpeechSynthesisUtterance(desc.text);
			activeSpeechState.pinnedUtterances.push(u);
			window.__dshPinnedUtterances = activeSpeechState.pinnedUtterances;
			u.lang = chosenVoice?.lang || (prepared.docLang === "en" ? "en-US" : "zh-CN");
			if (chosenVoice) u.voice = chosenVoice;
			u.rate = activeSpeechState.rate;
			let settled = false;
			const unpinUtterance = () => {
				const pos = activeSpeechState.pinnedUtterances.indexOf(u);
				if (pos >= 0) activeSpeechState.pinnedUtterances.splice(pos, 1);
			};
			const advanceToNext = () => {
				if (settled || activeSpeechState.runId !== myRunId) return;
				settled = true;
				currentAdvanceFn = null;
				unpinUtterance();
				if (idx + 1 < chunkDescriptors.length) speakChunkAt(idx + 1);
				else finishSpeechPlayback();
			};
			currentAdvanceFn = advanceToNext;
			u.onstart = () => {
				if (activeSpeechState.runId !== myRunId) return;
				const t = Date.now();
				lastChunkStartAt = t;
				lastSynthBusyAt = t;
				activeSpeechState.segmentStartedAt = t;
			};
			u.onboundary = (ev) => {
				if (activeSpeechState.runId !== myRunId) return;
				const t = Date.now();
				lastSynthBusyAt = t;
				if (ev && typeof ev.charIndex === "number" && ev.charIndex >= 0) {
					activeSpeechState.boundaryCharOffset = desc.baseOffset + ev.charIndex;
					activeSpeechState.boundaryUpdatedAt = t;
				}
			};
			u.onend = () => {
				advanceToNext();
			};
			u.onerror = (ev) => {
				if (settled || activeSpeechState.runId !== myRunId) return;
				settled = true;
				currentAdvanceFn = null;
				unpinUtterance();
				const errCode = String(ev?.error || "").toLowerCase();
				if (errCode === "not-allowed" || errCode === "service-not-allowed") {
					finishSpeechPlayback();
					return;
				}
				if (errorSkipCount < 3 && idx + 1 < chunkDescriptors.length) {
					errorSkipCount += 1;
					speakChunkAt(idx + 1);
					return;
				}
				if (_recoveryDepth < 2 && chunkDescriptors.length === 1) {
					const approxOffset = computeSpeechResumeOffset({
						fullText: fullSpokenText,
						docLang: prepared.docLang,
						segmentBaseOffset: activeSpeechState.segmentBaseOffset,
						segmentStartedAt: activeSpeechState.segmentStartedAt,
						segmentRate: activeSpeechState.segmentRate,
						boundaryCharOffset: activeSpeechState.boundaryCharOffset,
						boundaryUpdatedAt: activeSpeechState.boundaryUpdatedAt,
						nowMs: Date.now()
					});
					const nextSentenceOffset = findNextSentenceOffset(Math.max(approxOffset, desc.baseOffset + 6));
					if (nextSentenceOffset > desc.baseOffset) {
						startAssistantSpeech(msgIdx, {
							startOffset: nextSentenceOffset,
							_recoveryDepth: _recoveryDepth + 1
						});
						return;
					}
				}
				finishSpeechPlayback();
			};
			try {
				if (synth.paused) synth.resume();
			} catch {}
			synth.speak(u);
		};
		activeSpeechState.watchdogTimer = setInterval(() => {
			if (activeSpeechState.runId !== myRunId || !activeSpeechState.playing) {
				clearInterval(activeSpeechState.watchdogTimer);
				activeSpeechState.watchdogTimer = null;
				return;
			}
			try {
				if (synth.paused) synth.resume();
				if (synth.speaking || synth.pending) {
					lastSynthBusyAt = Date.now();
					return;
				}
				if (currentChunkIdx >= 0 && Date.now() - Math.max(lastChunkStartAt, lastSynthBusyAt) > 1600) {
					if (typeof currentAdvanceFn === "function") currentAdvanceFn();
					else finishSpeechPlayback();
				}
			} catch {}
		}, 900);
		if (wasSynthBusy && isAppleWebKit) activeSpeechState.handoffTimer = setTimeout(() => {
			activeSpeechState.handoffTimer = null;
			speakChunkAt(0);
		}, 30);
		else speakChunkAt(0);
	}
	function toggleSpeakAssistantReply(msgIdx) {
		if (activeSpeechState.playing && activeSpeechState.sessionId === (activeSessionId || "") && activeSpeechState.msgIdx === msgIdx) {
			stopAssistantSpeech();
			return;
		}
		startAssistantSpeech(msgIdx, { startOffset: 0 });
	}
	function switchAssistantSpeechMode(msgIdx) {
		activeSpeechState.mode = activeSpeechState.mode === "concise" ? "full" : "concise";
		try {
			localStorage.setItem("dsh_tts_mode_v2", activeSpeechState.mode);
		} catch {}
		if (activeSpeechState.playing && activeSpeechState.msgIdx === msgIdx) startAssistantSpeech(msgIdx, { startOffset: 0 });
		else syncSpeechFooterDom();
	}
	function cycleAssistantSpeechRate(msgIdx) {
		const prevRate = activeSpeechState.rate;
		const isCurrentlySpeakingThis = activeSpeechState.playing && activeSpeechState.sessionId === (activeSessionId || "") && activeSpeechState.msgIdx === msgIdx;
		const resumeOffset = isCurrentlySpeakingThis ? computeSpeechResumeOffset({
			fullText: activeSpeechState.fullSpokenText,
			docLang: activeSpeechState.docLang,
			segmentBaseOffset: activeSpeechState.segmentBaseOffset,
			segmentStartedAt: activeSpeechState.segmentStartedAt,
			segmentRate: prevRate,
			boundaryCharOffset: activeSpeechState.boundaryCharOffset,
			boundaryUpdatedAt: activeSpeechState.boundaryUpdatedAt,
			nowMs: Date.now()
		}) : 0;
		const curIdx = SPEECH_RATES.indexOf(prevRate);
		activeSpeechState.rate = SPEECH_RATES[(curIdx + 1) % SPEECH_RATES.length];
		try {
			localStorage.setItem("dsh_tts_rate", String(activeSpeechState.rate));
		} catch {}
		if (isCurrentlySpeakingThis) startAssistantSpeech(msgIdx, { startOffset: resumeOffset });
		else syncSpeechFooterDom();
	}
	function selectAgyApprovalOption(idx) {
		selectedAgyOptionIndex = Number(idx) || 1;
		document.querySelectorAll(".agy-approval-opt").forEach((el) => {
			el.classList.toggle("selected", Number(el.dataset.optIdx) === selectedAgyOptionIndex);
		});
	}
	function submitAgyApproval(hostId, code) {
		const idx = selectedAgyOptionIndex || 1;
		sendApprovalDecision(hostId, code, idx !== 4, idx);
	}
	function renderActiveChatStage(foundArg) {
		const found = foundArg && foundArg.session ? foundArg : findSessionGlobal(activeSessionId);
		if (!found) return;
		const { session: s } = found;
		if (s._wireTruncated && !expandedTranscriptBySession.has(s.id)) hydrateColdSessionTranscript(s.hostId, s.id, s.sessionRev || "");
		const chatHeaderTitle = stripRedundantProjectPrefix(s.title, s.project);
		const chatTitleEl = document.getElementById("chatTitle");
		if (chatTitleEl && chatTitleEl.dataset.titleKey !== `${langPref}:${chatHeaderTitle}`) {
			chatTitleEl.dataset.titleKey = `${langPref}:${chatHeaderTitle}`;
			chatTitleEl.textContent = chatHeaderTitle;
		}
		const harnessNameText = s.harness === "antigravity-ide" ? "Antigravity IDE" : s.harness === "codex" ? "Codex" : s.harness === "workbuddy" ? "WorkBuddy" : s.harness === "doubao" ? "豆包电脑版" : s.harness === "claude" ? "Claude Code" : "DSH";
		const isObserveOnly = s.controlMode === "observe-only" && s.harness !== "dsh";
		const modeTag = isObserveOnly ? " · 👀 仅观测" : s.controlMode === "idle-resumable" || s.controlMode === "observe-only" && s.harness === "dsh" ? " · 🔵 可续聊" : "";
		const compactChatProj = formatCompactProjectLabel(s.project);
		const nextSubHtml = `${renderHarnessBadgeHtml(s.harness, "inline")} ${esc$1(harnessNameText)} · 📁 ${esc$1(compactChatProj)} · 💻 ${esc$1(s.hostName)} (${s.msgCount} 条对话)${esc$1(modeTag)}`;
		const chatSubEl = document.getElementById("chatSub");
		const nextSubSig = `${langPref}:${nextSubHtml}`;
		if (chatSubEl && chatSubEl.dataset.subSig !== nextSubSig) {
			chatSubEl.dataset.subSig = nextSubSig;
			chatSubEl.innerHTML = nextSubHtml;
		}
		let otherApproval = null;
		for (const h of hubState.hosts || []) {
			const app = (h.bridgeState?.approvals || []).find((a) => a.agentId !== s.id);
			if (app) {
				otherApproval = {
					app,
					host: h
				};
				break;
			}
		}
		const alertBar = document.getElementById("chatSwitchAlert");
		if (otherApproval) {
			const isOtherQuestion = Boolean(otherApproval.app.kind === "question" || Array.isArray(otherApproval.app.questions));
			const otherProj = otherApproval.app.project ? `${formatCompactProjectLabel(otherApproval.app.project)} / ` : "";
			const nextAlertHtml = `
          <span>${isOtherQuestion ? "💬" : "⏳"} [${esc$1(otherApproval.host.hostName)}]「${esc$1(otherProj)}${esc$1(otherApproval.app.title || otherApproval.app.toolName)}」${isOtherQuestion ? "待你选择" : "待你审批"}</span>
          <button style="border:none;background:#d97706;color:#fff;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;" onclick="openChat('${esc$1(otherApproval.app.agentId)}')">立即切换 ›</button>
        `;
			alertBar.style.display = "flex";
			const nextAlertSig = `${langPref}:${nextAlertHtml}`;
			if (alertBar.dataset.alertSig !== nextAlertSig) {
				alertBar.dataset.alertSig = nextAlertSig;
				alertBar.innerHTML = nextAlertHtml;
			}
		} else {
			alertBar.style.display = "none";
			alertBar.dataset.alertSig = "";
		}
		reconcileDeliveredComposerDraft(s, found.host);
		switchComposerSession(s.id);
		updateChatModelPill(s, found.host);
		const composerKey = `${s.id}:${s.status}:${s.controlMode || ""}`;
		if (composerKey !== lastRenderedComposerKey) {
			lastRenderedComposerKey = composerKey;
			const runningBar = document.getElementById("runningControlBar");
			const chatInput = document.getElementById("globalPromptInput");
			const sendBtn = document.getElementById("chatSendBtn");
			const voiceBtn = document.getElementById("chatVoiceBtn");
			const imageBtn = document.getElementById("chatImageBtn");
			const composerCard = document.getElementById("composerUnifiedCard");
			const toolbarRow = typeof document.querySelector === "function" ? document.querySelector("#composerUnifiedCard .composer-toolbar-row") : null;
			const attachStrip = document.getElementById("composerAttachmentsStrip");
			if (isObserveOnly) {
				runningBar.classList.remove("show");
				chatInput.disabled = true;
				sendBtn.disabled = true;
				sendBtn.style.display = "none";
				chatInput.placeholder = "👀 当前会话为观察模式（仅支持查看对话记录）";
				sendBtn.textContent = "👀 仅观察";
				if (composerCard?.classList) composerCard.classList.remove("wechat-voice-mode");
				if (voiceBtn) {
					voiceBtn.disabled = true;
					voiceBtn.style.display = "none";
				}
				if (imageBtn) {
					imageBtn.disabled = true;
					imageBtn.style.display = "none";
				}
				if (toolbarRow) toolbarRow.style.display = "none";
				if (attachStrip) attachStrip.style.display = "none";
			} else {
				if (composerCard?.classList) composerCard.classList.toggle("wechat-voice-mode", Boolean(isWechatVoiceMode()));
				if (voiceBtn) {
					voiceBtn.disabled = false;
					voiceBtn.style.display = "";
				}
				if (imageBtn) {
					imageBtn.disabled = false;
					imageBtn.style.display = "";
				}
				if (toolbarRow) toolbarRow.style.display = "";
				renderAttachmentStrip("chat");
				if (s.status === "running") {
					runningBar.classList.add("show");
					if (!(s.capabilities?.canSteer !== false && s.harness !== "claude")) {
						chatInput.disabled = true;
						sendBtn.disabled = true;
						sendBtn.style.display = "none";
						chatInput.placeholder = "⏳ 当前后端正在执行中（不支持实时插话，可点击上方停止）";
						sendBtn.textContent = "🟢 执行中";
					} else {
						chatInput.disabled = false;
						sendBtn.disabled = false;
						sendBtn.style.display = "";
						chatInput.placeholder = "⚡ 实时插话 (Steer)：补充指令将立即注入...";
						sendBtn.textContent = "⚡ 插话";
					}
				} else {
					runningBar.classList.remove("show");
					chatInput.disabled = false;
					sendBtn.disabled = false;
					sendBtn.style.display = "";
					chatInput.placeholder = s.controlMode === "idle-resumable" ? `发指令通过 ${s.harnessLabel || s.harness} CLI 继续对话...` : "发指令继续对话...";
					sendBtn.textContent = "发送";
				}
			}
			if (chatInput) chatInput.dataset.origPlaceholder = chatInput.placeholder;
			if (voiceBtn) voiceBtn.style.opacity = chatInput.disabled ? "0.52" : "";
			syncWechatHoldBtnState();
		}
		const trSig = s.transcript.slice(-6).map((m) => `${m.role}:${m.queuedCmdId || ""}:${m.expiredCmdId || ""}:${(m.text || "").length}:${(m.text || "").slice(-32)}:${(m.thinking || "").length}:${(m.tools || []).length}:${(m.artifacts || []).length}:${m.waitingForInput ? 1 : 0}`).join("|");
		const fcMeta = computeChangedFilesMeta(s.changedFiles);
		const fcReviewed = Boolean(fcMeta.sig && filesCardReviewedSigBySession.get(s.id) === fcMeta.sig);
		const fcCollapsed = !filesExpandedSessionIds.has(s.id);
		const artCollapsed = !artifactsExpandedSessionIds.has(s.id);
		const chatKey = `${s.id}:${s.status}:${s.sessionRev || ""}:${s.transcript.length}:${hydratingWireSessionIds.has(s.id) ? 1 : 0}:${trSig}:${s.approvalObj?.code || ""}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ""}:${(s.changedFiles || []).length}:${fcMeta.sig}:${fcCollapsed ? 1 : 0}:${fcReviewed ? 1 : 0}:${artCollapsed ? 1 : 0}:${(s.artifacts || []).length}`;
		if (chatKey === lastRenderedChatKey) return;
		const box = document.getElementById("chatMessages");
		if (lastRenderedChatKey && box && box.dataset.dshSession === String(activeSessionId) && chatTouchDownAt > 0 && Date.now() - chatTouchDownAt < 3500) {
			pendingChatRenderAfterTouch = true;
			return;
		}
		pendingChatRenderAfterTouch = false;
		lastRenderedChatKey = chatKey;
		selectedAgyOptionIndex = 1;
		const openDetailIds = new Set(Array.from(box.querySelectorAll("details[open][data-detail-id]")).map((el) => el.dataset.detailId));
		const sessionSwitched = box.dataset.dshSession !== String(activeSessionId) || lastRenderedChatSessionId !== s.id;
		if (sessionSwitched) chatPinnedToBottom = true;
		const prevScrollTop = box.scrollTop;
		const prevScrollHeight = box.scrollHeight;
		box.dataset.dshSession = String(activeSessionId);
		const rawMsgs = s.transcript.length > 0 ? s.transcript : [{
			role: "assistant",
			text: s.rawLastPreview || s.lastPreview
		}];
		const msgs = [];
		for (const item of rawMsgs) {
			if (!item) continue;
			const prev = msgs[msgs.length - 1];
			if (item.role === "assistant" && prev && prev.role === "assistant" && !prev.waitingForInput && !item.waitingForInput) {
				if (!prev._thoughtList) {
					prev._thoughtList = prev.thinking ? [String(prev.thinking).trim()] : [];
					prev._textList = prev.text && !prev.isToolStepOnly ? [String(prev.text).trim()] : [];
					prev._toolList = [...Array.isArray(prev.toolCalls) && prev.toolCalls.length > 0 ? prev.toolCalls : prev.tools || []];
					prev._artifactMap = new Map((Array.isArray(prev.artifacts) ? prev.artifacts : []).filter((a) => a && a.path).map((a) => [a.path, a]));
					prev._stepCount = prev.thinkingStepCount || (prev.thinking ? 1 : 0);
				}
				if (item.thinking && String(item.thinking).trim()) {
					prev._thoughtList.push(String(item.thinking).trim());
					prev._stepCount += item.thinkingStepCount || 1;
				}
				if (item.text && !item.isToolStepOnly && String(item.text).trim()) prev._textList.push(String(item.text).trim());
				const nextTools = Array.isArray(item.toolCalls) && item.toolCalls.length > 0 ? item.toolCalls : item.tools || [];
				for (const t of nextTools) if (t) prev._toolList.push(t);
				for (const a of Array.isArray(item.artifacts) ? item.artifacts : []) if (a && a.path) prev._artifactMap.set(a.path, a);
				prev.thinkingStepCount = prev._stepCount;
				prev.thinking = prev._thoughtList.length <= 1 ? prev._thoughtList[0] || "" : prev._thoughtList.map((th, idx) => th.startsWith("【思考") ? th : `【思考 ${idx + 1}】\n${th}`).join("\n\n");
				prev.text = prev._textList.join("\n\n");
				prev.tools = prev._toolList;
				prev.toolCalls = prev._toolList;
				prev.artifacts = prev._artifactMap.size > 0 ? [...prev._artifactMap.values()] : void 0;
				prev.isToolStepOnly = false;
			} else msgs.push({ ...item });
		}
		lastRenderedAssistantTexts = {};
		const bubblesHtml = msgs.map((m, msgIdx) => {
			if (m.role === "user") {
				const queuedBadge = m.queuedCmdId ? `<div class="queued-cmd-pill"><span>⏳ 排队中（电脑上线后执行）</span><button class="cancel-queued-btn" onclick="event.stopPropagation(); cancelQueuedCommand('${esc$1(m.queuedCmdId)}')">✕ 取消</button></div>` : m.expiredCmdId ? `<div class="queued-cmd-pill" style="background:rgba(239,68,68,0.18);color:#fecaca;"><span>⚠️ 电脑超过 10 分钟未上线，该指令已超时未执行</span></div>` : "";
				const parsedUser = parseUserMessageAndMedia(m);
				const textHtml = parsedUser.text ? `<div class="user-bubble-text">${esc$1(parsedUser.text)}</div>` : "";
				let mediaGridHtml = "";
				if (parsedUser.optImgs && parsedUser.optImgs.length > 0) mediaGridHtml = `<div class="user-msg-media-grid">${parsedUser.optImgs.map((it, idx) => `
            <div class="user-msg-img-card" onclick="openOptimisticImagePreview('${esc$1(m.optId)}', ${idx})">
              <img class="user-msg-thumb saveable-preview-img" src="${it.dataUrl}" alt="${esc$1(it.name)}" />
              <span class="user-msg-img-badge">🔍 ${esc$1(it.name)}</span>
            </div>
          `).join("")}</div>`;
				else if (parsedUser.mediaItems.length > 0) mediaGridHtml = `<div class="user-msg-media-grid">${parsedUser.mediaItems.map((it) => {
					const encPrimary = encodeURIComponent(it.primaryPath).replace(/'/g, "%27");
					const encBackup = encodeURIComponent(it.backupPath || "").replace(/'/g, "%27");
					return `<div class="user-msg-img-card md-user-img-pending" data-local-img-path="${esc$1(it.primaryPath)}" data-backup-img-path="${esc$1(it.backupPath || "")}" data-img-label="${esc$1(it.label)}" onclick="openUserBubbleImage(this, '${encPrimary}', '${encBackup}')"><span class="user-msg-img-placeholder">🖼️ ${esc$1(it.label)}</span></div>`;
				}).join("")}</div>`;
				else if (parsedUser.pendingRemoteImgCount > 0) mediaGridHtml = `<div class="queued-cmd-pill"><span>🖼️ 已附带 ${parsedUser.pendingRemoteImgCount} 张截图</span></div>`;
				return `<div class="bubble user">${textHtml}${mediaGridHtml}${queuedBadge}</div>`;
			}
			const thinkId = `think-${msgIdx}`;
			const stepCountLabel = m.thinkingStepCount > 1 ? ` · 共 ${m.thinkingStepCount} 步` : "";
			const thought = m.thinking ? `<details class="thought-box thinking-details" data-detail-id="${thinkId}" ${openDetailIds.has(thinkId) ? "open" : ""}><summary>💭 思考过程${stepCountLabel} (点击展开)</summary><div style="margin-top:6px;white-space:pre-wrap;">${esc$1(m.thinking)}</div></details>` : "";
			if (m.isToolStepOnly) {
				const toolOut = (m.tools || []).map((t) => t.commandLine || t.summary || "").filter(Boolean).join("\n");
				const waitText = m.waitingForInput ? `<div style="margin-top:6px;font-size:12.5px;color:var(--muted);">Waiting for user input.</div>` : "";
				const stepToolId = `tool-step-${msgIdx}`;
				return `
            <div class="bubble assistant" style="padding:2px 0;">
              ${thought}
              <details class="tool-chip-details" data-detail-id="${stepToolId}" ${openDetailIds.has(stepToolId) ? "open" : ""} style="border:none;background:transparent;">
                <summary style="padding:2px 0;font-size:13px;color:var(--text-secondary);">
                  <span>${esc$1(m.text)}</span>
                  <span style="color:var(--muted);font-size:11px;">›</span>
                </summary>
                ${toolOut ? `<div class="tool-chip-output" style="margin-top:6px;border-radius:6px;">${esc$1(toolOut)}</div>` : ""}
              </details>
              ${waitText}
            </div>
          `;
			}
			const rawTools = Array.isArray(m.toolCalls) && m.toolCalls.length > 0 ? m.toolCalls : m.tools || [];
			let tools = "";
			if (rawTools.length > 0) {
				const isOlderCollapsedMsg = msgIdx < msgs.length - 6;
				const toolItemsHtml = rawTools.map((t, tIdx) => {
					const tName = typeof t === "string" ? t : t.name || "tool";
					const tSummary = typeof t === "string" ? "" : t.summary || t.argsSummary || "";
					const rawDetail = typeof t === "string" ? "执行完毕" : t.commandLine || t.output || tSummary || "执行完毕";
					const tDetail = isOlderCollapsedMsg && rawDetail.length > 600 ? rawDetail.slice(0, 600) + "..." : rawDetail;
					const chipId = `tool-${msgIdx}-${tIdx}`;
					return `
              <details class="tool-chip-details" data-detail-id="${chipId}" ${openDetailIds.has(chipId) ? "open" : ""}>
                <summary><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔧 ${esc$1(tName)}${tSummary ? ` · ${esc$1(tSummary.slice(0, 64))}` : ""}</span><span style="color:#94a3b8;font-size:10.5px;white-space:nowrap;flex-shrink:0;">点击查看详情 ▾</span></summary>
                <div class="tool-chip-output">${esc$1(tDetail)}</div>
              </details>
            `;
				}).join("");
				if (rawTools.length > 1) {
					const groupId = `tool-group-${msgIdx}`;
					const uniqueToolNames = [...new Set(rawTools.map((t) => typeof t === "string" ? t : t.name || "tool"))].slice(0, 4).join(", ");
					tools = `<details class="thought-box thinking-details" data-detail-id="${groupId}" ${openDetailIds.has(groupId) ? "open" : ""} style="margin-bottom:8px;"><summary>🔧 执行过程 · 共 ${rawTools.length} 次工具调用 (${esc$1(uniqueToolNames)}) (点击展开)</summary><div class="tool-chips" style="margin-top:6px;">${toolItemsHtml}</div></details>`;
				} else tools = `<div class="tool-chips" style="margin-bottom:8px;">${toolItemsHtml}</div>`;
			}
			const msgArtifacts = Array.isArray(m.artifacts) ? m.artifacts.filter((a) => a && a.path) : [];
			const resolveArtifactBadgeTitle = (art, isHtmlArt) => {
				const rawT = String(art?.title || "").trim();
				const nameStem = String(art?.name || "").replace(/\.[a-z0-9]+$/i, "").trim();
				if (!rawT || rawT.toLowerCase() === nameStem.toLowerCase() || /^artifact$/i.test(rawT)) return art?.kind === "walkthrough" ? "Walkthrough" : isHtmlArt ? "HTML 网页" : "交付文档";
				return rawT;
			};
			const artifactsCardHtml = msgArtifacts.length > 0 ? `
        <div class="agy-artifact-card-list">
          ${msgArtifacts.map((art) => {
				const encArtPath = encodeURIComponent(art.path || "").replace(/'/g, "%27");
				const isHtmlArt = isHtmlFileName(art.name || art.path || "");
				return `
              <div class="agy-artifact-card" onclick="openChatFileLink('${encArtPath}')">
                <div class="agy-artifact-card-head">
                  <span class="agy-artifact-icon">${art.kind === "walkthrough" ? "📋" : art.kind === "plan" ? "🗺️" : art.kind === "task" ? "☑️" : isHtmlArt ? "🌐" : "📄"}</span>
                  <div class="agy-artifact-titles">
                    <div class="agy-artifact-title-row">
                      <span class="agy-artifact-kind-pill">${esc$1(resolveArtifactBadgeTitle(art, isHtmlArt))}</span>
                      <span class="agy-artifact-name">${esc$1(art.name || "walkthrough.md")}</span>
                    </div>
                    ${art.summary ? `<div class="agy-artifact-summary">${esc$1(String(art.summary).replace(/\s+/g, " ").slice(0, 140))}</div>` : ""}
                  </div>
                  <button type="button" class="agy-artifact-open-btn" onclick="event.stopPropagation(); openChatFileLink('${encArtPath}')">${isHtmlArt ? "体验网页 ›" : "打开 ›"}</button>
                </div>
              </div>
            `;
			}).join("")}
        </div>
      ` : "";
			const isColdTruncatedTail = Boolean(s._wireTruncated && !hydratedWireTranscriptBySession.has(s.id) && msgIdx === msgs.length - 1);
			const rawReplyText = m.text ? String(m.text).trim() : "";
			const cleanReplyText = isColdTruncatedTail && rawReplyText.length >= 250 ? rawReplyText.replace(/\[[^\]]*\]\([^)]*$/, "").replace(/\[[^\]]*$/, "").trimEnd() + "…" : rawReplyText;
			if (cleanReplyText) lastRenderedAssistantTexts[msgIdx] = cleanReplyText;
			const copyFooterHtml = cleanReplyText ? renderAssistantFooterHtml(s.id, msgIdx, cleanReplyText, { isTruncatedPreview: isColdTruncatedTail && rawReplyText.length >= 250 }) : "";
			const renderedMdHtml = cleanReplyText ? formatAssistantText(cleanReplyText, msgArtifacts) : "";
			const bodyHtml = renderedMdHtml ? `<div class="md-body">${renderedMdHtml}</div>${copyFooterHtml}` : cleanReplyText && msgArtifacts.length > 0 ? `${copyFooterHtml}` : `<div style="font-size:12.5px;color:var(--muted);margin-top:4px;">⚙️ 正在思考与执行工具调用...</div>`;
			return `<div class="bubble assistant">${thought}${tools}${bodyHtml}${artifactsCardHtml}</div>`;
		}).join("");
		const sessionArtifacts = Array.isArray(s.artifacts) ? s.artifacts.filter((a) => a && a.path) : [];
		const sessionArtifactsHtml = sessionArtifacts.length > 0 ? `
        <div class="agy-files-changed-card agy-session-artifacts-card${artCollapsed ? " is-collapsed" : ""}" data-artifacts-session="${esc$1(s.id)}">
          <button type="button" class="agy-session-artifacts-header" aria-expanded="${!artCollapsed}" onclick="toggleSessionArtifactsCard('${esc$1(s.id)}')">
            <span class="agy-session-artifacts-title">📋 AI 交付文档 / Walkthrough (${sessionArtifacts.length})</span>
            <span class="agy-artifacts-toggle-pill">${artCollapsed ? "展开 ⌄" : "收起 ⌃"}</span>
          </button>
          <div class="agy-artifact-rows">
            ${sessionArtifacts.map((art) => {
			const encArtPath = encodeURIComponent(art.path || "").replace(/'/g, "%27");
			const isHtmlArt = isHtmlFileName(art.name || art.path || "");
			const badgeIcon = art.kind === "walkthrough" ? "📋" : art.kind === "plan" ? "🗺️" : art.kind === "task" ? "☑️" : isHtmlArt ? "🌐" : "📄";
			const rawT = String(art?.title || "").trim();
			const nameStem = String(art?.name || "").replace(/\.[a-z0-9]+$/i, "").trim();
			const badgeTitle = !rawT || rawT.toLowerCase() === nameStem.toLowerCase() || /^artifact$/i.test(rawT) ? art.kind === "walkthrough" ? "Walkthrough" : isHtmlArt ? "HTML 网页" : "交付文档" : rawT;
			const summaryText = art.summary ? String(art.summary).replace(/\s+/g, " ").trim().slice(0, 80) : "";
			const hasDistinctSummary = Boolean(summaryText && summaryText.toLowerCase() !== String(art.name || "").trim().toLowerCase());
			return `
            <div class="agy-file-row agy-artifact-row${hasDistinctSummary ? " has-summary" : ""}" style="cursor:pointer;" onclick="openChatFileLink('${encArtPath}')">
              <span class="agy-artifact-row-icon">${badgeIcon}</span>
              <span class="agy-artifact-kind-badge">${esc$1(badgeTitle)}</span>
              <span class="agy-file-name">${esc$1(art.name || "")}</span>
              ${hasDistinctSummary ? `<span class="agy-file-path">${esc$1(summaryText)}</span>` : ""}
              <span class="agy-artifact-open-tag">${isHtmlArt ? "体验网页 ›" : "打开 ›"}</span>
            </div>
          `;
		}).join("")}
          </div>
        </div>
      ` : "";
		const filesChangedHtml = (s.harness === "antigravity-ide" || s.harness === "codex") && Array.isArray(s.changedFiles) && s.changedFiles.length > 0 ? `
        <div class="agy-files-changed-card${fcCollapsed ? " is-collapsed" : ""}" data-files-session="${esc$1(s.id)}">
          <div class="agy-files-rows">
            ${s.changedFiles.slice(-8).map((fc) => {
			return `
            <div class="agy-file-row" style="cursor:pointer;" onclick="openChatFileLink('${encodeURIComponent(fc.path || fc.name || "").replace(/'/g, "%27")}')">
              <span class="agy-file-dot">◉</span>
              <span class="agy-file-diff"><span class="add">+${Number(fc.added || 0)}</span><span class="del">-${Number(fc.removed || 0)}</span></span>
              <span class="agy-file-name">${esc$1(fc.name || "")}</span>
              <span class="agy-file-path">${esc$1(fc.displayPath || fc.path || "")}</span>
            </div>
          `;
		}).join("")}
          </div>
          <div class="agy-files-footer">
            <button type="button" class="agy-files-toggle" aria-expanded="${!fcCollapsed}" onclick="toggleFilesChangedCard('${esc$1(s.id)}')">
              <span>📄 ${s.changedFiles.length} Files With Changes</span>
              <span class="agy-files-chevron">${fcCollapsed ? "⌄" : "⌃"}</span>
            </button>
            <div class="agy-files-footer-btns">
              <button type="button" class="agy-files-reject" onclick="openChangedFilesDrawer('${esc$1(s.id)}')">查看改动</button>
              ${fcReviewed ? "" : `<button type="button" class="agy-files-accept" onclick="reviewFilesChangedCard('${esc$1(s.id)}', '${esc$1(fcMeta.sig)}')">确认已阅</button>`}
            </div>
          </div>
        </div>
      ` : "";
		const isQuestionApproval = Boolean(s.approvalObj && (s.approvalObj.kind === "question" || Array.isArray(s.approvalObj.questions)));
		const isAgyApproval = s.approvalObj && !isQuestionApproval && (s.approvalObj.harness === "antigravity-ide" || Array.isArray(s.approvalObj.options));
		const approvalStatusNoticeHtml = s.approvalObj?.lastError ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.35);color:#ef4444;font-size:12px;font-weight:600;">⚠️ ${esc$1(s.approvalObj.lastError)}</div>` : s.approvalObj?.settling ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:var(--amber-soft);color:#d97706;font-size:12px;font-weight:600;">⏳ 正在同步到电脑端执行（最长等待 45 秒）...</div>` : "";
		const qDraft = isQuestionApproval ? getDshQuestionDraft(s.approvalObj.code, s.approvalObj.questions) : null;
		const approvalCardHtml = s.approvalObj ? isQuestionApproval ? `
        <div class="dsh-question-card" data-question-code="${esc$1(s.approvalObj.code)}">
          <div class="dsh-question-card-header">
            <span class="dsh-question-badge-icon">💬</span>
            <div class="dsh-question-card-title">${esc$1(s.approvalObj.promptTitle || "请做出选择以继续")}</div>
          </div>
          ${approvalStatusNoticeHtml}
          <div class="dsh-question-list">
            ${(Array.isArray(s.approvalObj.questions) ? s.approvalObj.questions : []).map((q, qIdx) => {
			const qId = String(q.id || `q_${qIdx + 1}`);
			const draftItem = qDraft?.[qId] || {
				selected: [],
				customText: ""
			};
			const selectedSet = new Set(Array.isArray(draftItem.selected) ? draftItem.selected : []);
			const opts = Array.isArray(q.options) ? q.options : [];
			const detailId = `q-detail-${esc$1(s.approvalObj.code)}-${qIdx}`;
			return `
                <div class="dsh-question-block" data-question-id="${esc$1(qId)}">
                  <div class="dsh-question-prompt-line">
                    ${q.header ? `<span class="dsh-question-header-pill">${esc$1(q.header)}</span>` : ""}
                    <span class="dsh-question-prompt-text">${esc$1(q.question || q.header || "请选择一项")}</span>
                    ${q.multiSelect ? `<span class="dsh-question-multi-tag">可多选</span>` : ""}
                  </div>
                  ${q.detail ? `
                    <details class="thought-box thinking-details" data-detail-id="${detailId}" ${openDetailIds.has(detailId) ? "open" : ""} style="margin:6px 0 8px;">
                      <summary>📄 查看完整方案内容 (点击展开)</summary>
                      <div class="md-body" style="margin-top:8px;max-height:260px;overflow-y:auto;">${formatAssistantText(String(q.detail))}</div>
                    </details>
                  ` : ""}
                  <div class="dsh-question-options">
                    ${opts.map((opt, oIdx) => {
				const label = String(opt.label || `选项 ${oIdx + 1}`);
				const isSel = selectedSet.has(label);
				return `
                        <button
                          type="button"
                          class="dsh-question-opt ${isSel ? "selected" : ""}"
                          data-q-id="${esc$1(qId)}"
                          data-opt-label="${esc$1(label)}"
                          ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="toggleDshQuestionOption('${esc$1(s.approvalObj.code)}', '${esc$1(qId)}', '${esc$1(label)}', ${Boolean(q.multiSelect)})"`}
                        >
                          <div class="dsh-question-opt-top">
                            <span class="dsh-question-opt-check">${q.multiSelect ? isSel ? "☑" : "☐" : isSel ? "◉" : "○"}</span>
                            <span class="dsh-question-opt-label">${esc$1(label)}</span>
                          </div>
                          ${opt.description ? `<div class="dsh-question-opt-desc">${esc$1(opt.description)}</div>` : ""}
                        </button>
                      `;
			}).join("")}
                  </div>
                  <div class="dsh-question-custom-wrap">
                    <input
                      type="text"
                      class="dsh-question-custom-input"
                      data-q-id="${esc$1(qId)}"
                      placeholder="或者直接输入自定义回答 / 补充说明..."
                      value="${esc$1(draftItem.customText || "")}"
                      ${s.approvalObj.settling ? "disabled" : `oninput="onDshQuestionCustomInput('${esc$1(s.approvalObj.code)}', '${esc$1(qId)}', this.value)"`}
                    />
                  </div>
                </div>
              `;
		}).join("")}
          </div>
          <div class="dsh-question-footer">
            <button
              type="button"
              class="dsh-question-btn-skip"
              ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="sendApprovalDecision('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}', false, 4, '${esc$1(s.id)}')"`}
            >跳过 / 取消</button>
            <button
              type="button"
              class="dsh-question-btn-submit"
              ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="submitDshQuestionAnswers('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}', '${esc$1(s.id)}')"`}
            >${s.approvalObj.settling ? "⏳ 正在提交..." : "提交选择 ↵"}</button>
          </div>
        </div>
      ` : isAgyApproval ? `
        <div class="agy-approval-card">
          <div class="agy-approval-header">
            <span class="agy-approval-term-icon">&gt;_</span>
            <span>${esc$1(s.approvalObj.promptTitle || `Allow ${s.approvalObj.toolName}?`)}</span>
          </div>
          <div class="agy-approval-subtitle">${esc$1(s.approvalObj.subtitle || "the auto-run safety check did not reach a decision")}</div>
          ${s.approvalObj.commandLine ? `<div class="agy-approval-cmd">${esc$1(s.approvalObj.commandLine)}</div>` : `<div class="agy-approval-cmd">${esc$1(s.approvalObj.reason || "")}</div>`}
          ${approvalStatusNoticeHtml}
          <div class="agy-approval-options">
            ${(s.approvalObj.options && s.approvalObj.options.length > 0 ? s.approvalObj.options : [
			{
				index: 1,
				label: "Yes, allow this time"
			},
			{
				index: 2,
				label: "Yes, and always allow in this conversation"
			},
			{
				index: 3,
				label: "Yes, and always allow"
			},
			{
				index: 4,
				label: "No (tell the agent what to do instead)"
			}
		]).map((opt) => `
              <button type="button" class="agy-approval-opt ${opt.index === 1 ? "selected" : ""}" data-opt-idx="${opt.index}" ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="selectAgyApprovalOption(${opt.index})" ondblclick="sendApprovalDecision('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}', ${opt.index !== 4}, ${opt.index})"`}>
                <span class="agy-opt-num">${opt.index}</span>
                <span>${esc$1(opt.label)}</span>
              </button>
            `).join("")}
          </div>
          <div class="agy-approval-footer">
            <button type="button" class="agy-btn-skip" ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="sendApprovalDecision('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}', false, 4)"`}>Skip</button>
            <button type="button" class="agy-btn-submit" ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="submitAgyApproval('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}')"`}>${s.approvalObj.settling ? "⏳ 处理中..." : "Submit <span>↵</span>"}</button>
          </div>
        </div>
      ` : `
        <div class="inline-approval-card">
          <div class="inline-approval-title">⏳ 等待你确认工具调用：${esc$1(s.approvalObj.toolName)}</div>
          <div class="inline-approval-cmd">${esc$1(s.approvalObj.reason || "请求执行权限")}</div>
          ${approvalStatusNoticeHtml}
          <div class="inline-approval-btns">
            <button style="background:#10b981;color:#fff;${s.approvalObj.settling ? "opacity:0.6;cursor:not-allowed;" : ""}" ${s.approvalObj.settling ? "disabled" : `onclick="sendApprovalDecision('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}', true, 1)"`}>${s.approvalObj.settling ? "⏳ 正在同步..." : "✅ 允许执行"}</button>
            <button style="background:#fee2e2;color:#dc2626;${s.approvalObj.settling ? "opacity:0.6;cursor:not-allowed;" : ""}" ${s.approvalObj.settling ? "disabled" : `onclick="sendApprovalDecision('${esc$1(s.hostId)}', '${esc$1(s.approvalObj.code)}', false, 4)"`}>✕ 拒绝</button>
          </div>
        </div>
      ` : "";
		const followupsHtml = `
        <div class="quick-followups">
          ${Object.keys(lastRenderedAssistantTexts).length > 0 ? `<button class="followup-pill" onclick="copyLatestAssistantReply(this)">📋 复制最新回复全文</button>` : ""}
          ${[
			"▶ 继续执行下一步",
			"🔍 查看 git status 与改动",
			"🧪 运行测试验证"
		].map((f) => `<button class="followup-pill" onclick="sendQuickFollowup('${esc$1(f)}')">${esc$1(f)}</button>`).join("")}
        </div>
      `;
		const loadEarlierHtml = Boolean(s._wireTruncated && hydratingWireSessionIds.has(s.id)) ? `<div style="text-align:center;font-size:12px;color:var(--muted);margin:4px 0 10px;">⏳ 正在同步完整对话内容…</div>` : s.omittedTranscriptCount > 0 ? `
          <div style="display:flex;justify-content:center;margin:4px 0 10px;">
            <button
              type="button"
              class="followup-pill"
              style="font-size:12px;padding:6px 14px;"
              onclick="loadEarlierTranscript('${esc$1(s.hostId)}', '${esc$1(s.id)}', this)"
            >⬆️ 为保证秒开已省略前 ${s.omittedTranscriptCount} 条早先记录 · 点击加载完整历史</button>
          </div>
        ` : expandedTranscriptBySession.has(s.id) ? `<div style="text-align:center;font-size:11.5px;color:var(--muted);margin:4px 0 10px;">✅ 已加载全部历史对话（共 ${s.transcript.length} 条）</div>` : "";
		const firstMsg = msgs[0];
		const nextFirstMsgSig = firstMsg ? `${firstMsg.role}:${String(firstMsg.text || "").slice(0, 36)}` : "";
		const prevFirstMsgSig = lastFirstMsgSigBySession.get(s.id) || "";
		lastFirstMsgSigBySession.set(s.id, nextFirstMsgSig);
		box.innerHTML = loadEarlierHtml + bubblesHtml + sessionArtifactsHtml + filesChangedHtml + approvalCardHtml + followupsHtml;
		hydrateInlineChatImages(s, box);
		if (sessionSwitched || chatPinnedToBottom) pinChatToBottomImmediate(box);
		else {
			programmaticChatScrollUntil = Date.now() + 150;
			if (prevFirstMsgSig && nextFirstMsgSig !== prevFirstMsgSig && box.scrollHeight > prevScrollHeight) box.scrollTop = Math.max(0, prevScrollTop + (box.scrollHeight - prevScrollHeight));
			else box.scrollTop = prevScrollTop;
			lastChatScrollTop = box.scrollTop;
			setScrollBottomVisible(true);
		}
		lastRenderedChatSessionId = s.id;
		if (langPref === "en") applyLangToDom(document.getElementById("chatFullscreen") || document.body, langPref);
	}
	async function hydrateColdSessionTranscript(hostId, sessionId, sessionRev = "") {
		if (!hostId || !sessionId || hydratingWireSessionIds.has(sessionId)) return;
		const existing = hydratedWireTranscriptBySession.get(sessionId);
		if (existing && (!sessionRev || existing.sessionRev === sessionRev || Date.now() - (existing.fetchedAt || 0) < 8e3)) return;
		hydratingWireSessionIds.add(sessionId);
		try {
			const data = await (await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/sessions/${encodeURIComponent(sessionId)}/transcript`)).json();
			if (data?.ok && Array.isArray(data.transcript) && data.transcript.length > 0) hydratedWireTranscriptBySession.set(sessionId, {
				transcript: data.transcript,
				sessionRev: data.sessionRev || sessionRev || "",
				fetchedAt: Date.now()
			});
		} catch {} finally {
			hydratingWireSessionIds.delete(sessionId);
			if (activeSessionId === sessionId || triageCtrl?.isOpen()) {
				lastRenderedChatKey = "";
				renderAll();
				if (activeSessionId === sessionId && chatPinnedToBottom) scheduleChatPaintAndScrollSync(sessionId);
			}
		}
	}
	async function loadEarlierTranscript(hostId, sessionId, btnEl) {
		if (!hostId || !sessionId) return;
		if (btnEl) {
			btnEl.disabled = true;
			btnEl.textContent = "⏳ 正在拉取完整历史对话...";
		}
		try {
			const currentSess = findSessionGlobal(sessionId)?.session;
			const currentLen = currentSess?.transcript?.length || 0;
			const data = await (await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/sessions/${encodeURIComponent(sessionId)}/transcript`)).json();
			const totalExpected = Math.max(Number(data?.totalCount) || 0, Number(currentSess?.totalTranscriptCount) || 0);
			if (data?.ok && Array.isArray(data.transcript) && data.transcript.length > currentLen && data.hasMore !== true && (totalExpected === 0 || data.transcript.length >= totalExpected)) {
				expandedTranscriptBySession.set(sessionId, {
					transcript: data.transcript,
					totalCount: totalExpected || data.transcript.length,
					fetchedAt: Date.now()
				});
				lastRenderedChatKey = "";
				renderAll();
				showToast(`✅ 已加载完整历史（共 ${data.transcript.length} 条）`);
				return;
			}
			const cmdId = (await dispatchHostCommand(hostId, {
				type: "load_full_transcript",
				agentId: sessionId,
				maxMessages: 300
			}))?.command?.id;
			if (cmdId) for (let i = 0; i < 14; i++) {
				await new Promise((r) => setTimeout(r, 350));
				const pollData = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`)).json();
				if (pollData?.ready && Array.isArray(pollData?.result?.transcript)) {
					expandedTranscriptBySession.set(sessionId, {
						transcript: pollData.result.transcript,
						totalCount: Number(pollData.result.totalCount) || pollData.result.transcript.length,
						fetchedAt: Date.now()
					});
					lastRenderedChatKey = "";
					renderAll();
					showToast(`✅ 已从电脑加载完整历史（共 ${pollData.result.transcript.length} 条）`);
					return;
				}
			}
			if (data?.ok && Array.isArray(data.transcript) && data.transcript.length > currentLen) {
				expandedTranscriptBySession.set(sessionId, {
					transcript: data.transcript,
					totalCount: totalExpected || data.transcript.length,
					fetchedAt: Date.now()
				});
				lastRenderedChatKey = "";
				renderAll();
				showToast(`✅ 已加载云端可用历史（共 ${data.transcript.length} 条）`);
				return;
			}
			showToast("ℹ️ 当前已是最新可用历史记录");
		} catch (err) {
			showToast("❌ 加载历史失败：" + (err?.message || err));
		} finally {
			if (btnEl) btnEl.disabled = false;
		}
	}
	function scrollToChatBottom() {
		chatPinnedToBottom = true;
		const box = document.getElementById("chatMessages");
		if (box) {
			programmaticChatScrollUntil = Date.now() + 450;
			if (typeof box.scrollTo === "function") box.scrollTo({
				top: box.scrollHeight,
				behavior: "smooth"
			});
			else box.scrollTop = box.scrollHeight;
			lastChatScrollTop = box.scrollTop;
		}
		setScrollBottomVisible(false);
	}
	function setScrollBottomVisible(visible) {
		const btn = document.getElementById("scrollBottomBtn");
		if (!btn) return;
		const chatOpen = document.getElementById("chatFullscreen")?.classList.contains("open");
		btn.style.display = visible && chatOpen ? "flex" : "none";
	}
	function setupChatScrollWatcher() {
		const box = document.getElementById("chatMessages");
		if (!box) return;
		let gestureStartY = 0;
		box.addEventListener("touchstart", (e) => {
			if (e.touches && e.touches.length === 1) gestureStartY = e.touches[0].clientY;
		}, { passive: true });
		box.addEventListener("touchmove", (e) => {
			if (e.touches && e.touches.length === 1) {
				if (e.touches[0].clientY - gestureStartY > 10) lastUserUpwardGestureAt = Date.now();
			}
		}, { passive: true });
		box.addEventListener("wheel", (e) => {
			if (e.deltaY < -4) lastUserUpwardGestureAt = Date.now();
		}, { passive: true });
		box.addEventListener("scroll", () => {
			const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
			if (dist < 48) {
				chatPinnedToBottom = true;
				setScrollBottomVisible(false);
			} else if (Date.now() >= programmaticChatScrollUntil && Date.now() - lastUserUpwardGestureAt < 1600 && box.scrollTop < lastChatScrollTop - 4 && dist >= 96) {
				chatPinnedToBottom = false;
				setScrollBottomVisible(true);
			}
			lastChatScrollTop = box.scrollTop;
		}, { passive: true });
		box.addEventListener("load", () => {
			if (!chatPinnedToBottom || chatTouchDownAt > 0) return;
			pinChatToBottomImmediate(box);
			if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => {
				if (chatPinnedToBottom && chatTouchDownAt === 0) pinChatToBottomImmediate(box);
			});
		}, true);
		if (typeof ResizeObserver === "function") try {
			new ResizeObserver(() => {
				if (chatPinnedToBottom && chatTouchDownAt === 0) pinChatToBottomImmediate(box);
			}).observe(box);
		} catch {}
	}
	async function apiFetchWithTimeout(path, options = {}, timeoutMs = 1e4) {
		const ctrl = typeof AbortController === "function" ? new AbortController() : null;
		const timer = ctrl ? setTimeout(() => {
			try {
				ctrl.abort();
			} catch {}
		}, timeoutMs) : null;
		try {
			return await apiFetch(path, {
				cache: "no-store",
				...options,
				...ctrl ? { signal: ctrl.signal } : {}
			});
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
	let inFlightCommandCount = 0;
	let imagePickerActiveUntil = 0;
	const INFLIGHT_OUTBOX_KEY = "dsh_inflight_outbox_v1";
	function saveInflightOutboxEntry(entry) {
		if (!entry?.cmdId) return;
		try {
			const raw = sessionStorage.getItem(INFLIGHT_OUTBOX_KEY);
			const map = raw ? JSON.parse(raw) || {} : {};
			map[entry.cmdId] = entry;
			sessionStorage.setItem(INFLIGHT_OUTBOX_KEY, JSON.stringify(map));
		} catch {}
	}
	function removeInflightOutboxEntry(cmdId) {
		if (!cmdId) return;
		try {
			const raw = sessionStorage.getItem(INFLIGHT_OUTBOX_KEY);
			if (!raw) return;
			const map = JSON.parse(raw) || {};
			if (Object.prototype.hasOwnProperty.call(map, cmdId)) {
				delete map[cmdId];
				sessionStorage.setItem(INFLIGHT_OUTBOX_KEY, JSON.stringify(map));
			}
		} catch {}
	}
	async function dispatchHostCommand(hostId, payload) {
		const cmdPayload = payload && typeof payload === "object" && !payload.id ? {
			...payload,
			id: `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
		} : payload;
		const timeoutMs = Array.isArray(cmdPayload?.attachments) && cmdPayload.attachments.length > 0 ? 45e3 : 12e3;
		const reqInit = {
			method: "POST",
			body: JSON.stringify(cmdPayload)
		};
		const url = `/api/hosts/${encodeURIComponent(hostId)}/command`;
		inFlightCommandCount += 1;
		try {
			try {
				return await (await apiFetchWithTimeout(url, reqInit, timeoutMs)).json();
			} catch (err) {
				if (err && err.message === "Unauthorized") throw err;
				await new Promise((r) => setTimeout(r, 250));
				return await (await apiFetchWithTimeout(url, reqInit, timeoutMs)).json();
			}
		} finally {
			inFlightCommandCount = Math.max(0, inFlightCommandCount - 1);
		}
	}
	let composerSessionId = "";
	let composerDraftTimer = null;
	let lastSentComposerGuard = {
		sessionId: "",
		text: "",
		at: 0
	};
	function composerDraftKey(sessionId) {
		return "dsh_draft_v1_" + sessionId;
	}
	function composerDraftMetaKey(sessionId) {
		return "dsh_draft_meta_v1_" + sessionId;
	}
	function readComposerDraft(sessionId) {
		if (!sessionId) return "";
		try {
			return localStorage.getItem(composerDraftKey(sessionId)) || "";
		} catch {
			return "";
		}
	}
	function readComposerDraftMeta(sessionId) {
		if (!sessionId) return null;
		try {
			const raw = localStorage.getItem(composerDraftMetaKey(sessionId));
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}
	function clearComposerDraft(sessionId) {
		clearTimeout(composerDraftTimer);
		composerDraftTimer = null;
		if (!sessionId) return;
		try {
			localStorage.removeItem(composerDraftKey(sessionId));
			localStorage.removeItem(composerDraftMetaKey(sessionId));
		} catch {}
	}
	function computeSessionWireBaseline(sessionId, rawDraftText) {
		const cleanText = String(rawDraftText || "").trim();
		const found = sessionId ? findSessionGlobal(sessionId) : null;
		const wireTr = Array.isArray(found?.session?._wireTranscript) ? found.session._wireTranscript : [];
		return {
			wireSameCount: cleanText ? wireTr.filter((m) => m && m.role === "user" && matchesOptimisticUserText(m.text, cleanText)).length : 0,
			wireTotalCount: Number(found?.session?._wireTotalCount) || wireTr.length
		};
	}
	function writeComposerDraftValue(sessionId, rawValue, metaOverrides = null) {
		if (!sessionId) return;
		const strVal = String(rawValue ?? "");
		const trimmed = strVal.trim();
		try {
			if (!trimmed) {
				localStorage.removeItem(composerDraftKey(sessionId));
				localStorage.removeItem(composerDraftMetaKey(sessionId));
				return;
			}
			localStorage.setItem(composerDraftKey(sessionId), strVal);
			const prevMeta = readComposerDraftMeta(sessionId);
			let meta;
			if (metaOverrides && typeof metaOverrides === "object") meta = {
				text: trimmed,
				wireSameCount: Number(metaOverrides.wireSameCount ?? 0),
				wireTotalCount: Number(metaOverrides.wireTotalCount ?? 0),
				savedAt: Number(metaOverrides.savedAt || Date.now()),
				fromErrorRestore: Boolean(metaOverrides.fromErrorRestore),
				cmdId: String(metaOverrides.cmdId || "")
			};
			else if (prevMeta && prevMeta.text === trimmed && !prevMeta.fromErrorRestore) meta = prevMeta;
			else {
				const base = computeSessionWireBaseline(sessionId, trimmed);
				meta = {
					text: trimmed,
					wireSameCount: base.wireSameCount,
					wireTotalCount: base.wireTotalCount,
					savedAt: Date.now(),
					fromErrorRestore: false,
					cmdId: ""
				};
			}
			localStorage.setItem(composerDraftMetaKey(sessionId), JSON.stringify(meta));
		} catch {}
	}
	function persistComposerDraft(sessionId = composerSessionId) {
		if (!sessionId) return;
		const input = document.getElementById("globalPromptInput");
		if (!input) return;
		const val = String(input.value || "");
		if (val.trim() && lastSentComposerGuard.sessionId === sessionId && Date.now() - lastSentComposerGuard.at < 2e3 && val.trim() === lastSentComposerGuard.text) {
			input.value = "";
			clearComposerDraft(sessionId);
			return;
		}
		writeComposerDraftValue(sessionId, val);
	}
	function hasCommandOrPromptDelivered(session, host, cmdId, rawPromptText, baselineSameCount, baselineTotalCount) {
		if (!session) return false;
		if (cmdId && host) {
			const inPending = (host.pendingCommands || []).some((c) => c && c.id === cmdId);
			const inFlight = (host.inflightCommands || []).some((c) => c && c.id === cmdId);
			const okRecent = (host.recentResults || []).some((r) => r && r.id === cmdId && r.ok !== false && !r.cancelled && !r.expired);
			if (inPending || inFlight || okRecent) return true;
		}
		const cleanText = String(rawPromptText || "").trim();
		if (!cleanText) return false;
		const wireTr = Array.isArray(session._wireTranscript) ? session._wireTranscript : [];
		return hasOptimisticSyncedToWire(wireTr, Number(session._wireTotalCount) || wireTr.length, {
			text: cleanText,
			rawText: cleanText,
			baselineSameUserCount: typeof baselineSameCount === "number" ? baselineSameCount : 0,
			baselineTotalCount: typeof baselineTotalCount === "number" ? baselineTotalCount : 0
		});
	}
	function reconcileDeliveredComposerDraft(session, host) {
		if (!session || !session.id) return;
		const sid = session.id;
		const draftVal = readComposerDraft(sid);
		const trimmed = String(draftVal || "").trim();
		if (!trimmed) return;
		const meta = readComposerDraftMeta(sid);
		let delivered = false;
		if (meta && meta.text === trimmed) delivered = hasCommandOrPromptDelivered(session, host, meta.cmdId || "", trimmed, meta.wireSameCount, meta.wireTotalCount);
		else {
			const wireTr = Array.isArray(session._wireTranscript) ? session._wireTranscript : [];
			const userMsgs = (expandedTranscriptBySession.get(sid)?.transcript?.length > wireTr.length ? expandedTranscriptBySession.get(sid).transcript : wireTr).filter((m) => m && m.role === "user");
			const tailUserMsgs = userMsgs.slice(-2);
			if (trimmed.length >= 2 && tailUserMsgs.some((m) => matchesOptimisticUserText(m.text, trimmed)) || trimmed.length >= 8 && userMsgs.some((m) => matchesOptimisticUserText(m.text, trimmed))) delivered = true;
			else writeComposerDraftValue(sid, draftVal);
		}
		if (!delivered) return;
		clearComposerDraft(sid);
		if (meta?.fromErrorRestore) {
			clearChatAttachmentList(sid);
			if ((composerSessionId || activeSessionId) === sid) renderAttachmentStrip("chat");
		}
		const input = document.getElementById("globalPromptInput");
		if (input && (composerSessionId === sid || activeSessionId === sid) && String(input.value || "").trim() === trimmed && (meta?.fromErrorRestore || typeof document !== "undefined" && document.activeElement !== input)) {
			input.value = "";
			input.style.height = "";
			autoGrowComposer();
		}
	}
	function autoGrowComposer(event) {
		const input = document.getElementById("globalPromptInput");
		if (!input || input.tagName !== "TEXTAREA") return;
		if (event && event.isComposing && !String(input.value || "").includes("\n") && input.scrollHeight <= (input.clientHeight || 28) + 2) return;
		input.style.height = "auto";
		const fullHeight = input.scrollHeight || 24;
		input.style.height = Math.min(fullHeight, 132) + "px";
		input.style.overflowY = fullHeight > 132 ? "auto" : "hidden";
	}
	function onComposerInput(event) {
		const input = document.getElementById("globalPromptInput");
		const activeSid = composerSessionId || activeSessionId;
		if (input && lastSentComposerGuard.sessionId && lastSentComposerGuard.sessionId === activeSid && Date.now() - lastSentComposerGuard.at < 2e3 && event?.inputType !== "insertFromPaste") {
			const curVal = String(input.value || "").trim();
			const unfocusedGhostCommit = typeof document !== "undefined" && document.activeElement && document.activeElement !== input && Boolean(curVal);
			const exactEchoCommit = lastSentComposerGuard.text.length >= 2 && curVal === lastSentComposerGuard.text;
			if (unfocusedGhostCommit || exactEchoCommit) {
				input.value = "";
				clearComposerDraft(activeSid);
				autoGrowComposer();
				return;
			}
		}
		autoGrowComposer(event);
		clearTimeout(composerDraftTimer);
		composerDraftTimer = setTimeout(() => persistComposerDraft(), 250);
	}
	function onComposerKeydown(event) {
		if (event.key !== "Enter") return;
		if (!shouldSendOnEnter({
			shiftKey: event.shiftKey,
			isComposing: event.isComposing || event.keyCode === 229,
			coarsePointer: composerUsesCoarsePointer()
		})) return;
		event.preventDefault();
		sendPromptToActiveSession();
	}
	function switchComposerSession(nextSessionId) {
		const input = document.getElementById("globalPromptInput");
		if (!input) return;
		if (composerSessionId === nextSessionId) return;
		stopVoiceInput();
		stopAssistantSpeech();
		if (composerSessionId) {
			persistComposerDraft(composerSessionId);
			persistChatAttachmentsDraft(composerSessionId);
		}
		composerSessionId = nextSessionId || "";
		input.value = readComposerDraft(composerSessionId);
		input.style.height = "";
		autoGrowComposer();
		renderAttachmentStrip("chat");
		if ((String(input.value || "").trim().length > 0 || getAttachmentList("chat").length > 0) && isWechatVoiceMode()) setWechatVoiceMode(false, false, false);
	}
	const MAX_COMPOSER_ATTACHMENTS = 4;
	const chatAttachmentsBySession = /* @__PURE__ */ new Map();
	const composerAttachments = { newTask: [] };
	function composerAttachmentDraftKey(sessionId) {
		return "dsh_attach_draft_v1_" + sessionId;
	}
	function resolveChatAttachmentSessionKey(explicitSessionId = "") {
		return String(explicitSessionId || composerSessionId || activeSessionId || "_default");
	}
	function persistChatAttachmentsDraft(sessionId = "") {
		const sid = resolveChatAttachmentSessionKey(sessionId);
		if (!sid || sid === "_default") return;
		const list = chatAttachmentsBySession.get(sid) || [];
		try {
			if (list.length > 0) {
				const serializable = list.map((item) => ({
					name: item.name || "screenshot.jpg",
					mimeType: item.mimeType || "image/jpeg",
					dataBase64: item.dataBase64 || "",
					sizeBytes: Number(item.sizeBytes || 0)
				}));
				sessionStorage.setItem(composerAttachmentDraftKey(sid), JSON.stringify(serializable));
			} else sessionStorage.removeItem(composerAttachmentDraftKey(sid));
		} catch {}
	}
	function getAttachmentList(target = "chat", explicitSessionId = "") {
		if (target === "newTask") return composerAttachments.newTask;
		const sid = resolveChatAttachmentSessionKey(explicitSessionId);
		if (!chatAttachmentsBySession.has(sid)) {
			let restored = [];
			if (sid !== "_default") try {
				const raw = sessionStorage.getItem(composerAttachmentDraftKey(sid));
				const parsed = raw ? JSON.parse(raw) : null;
				if (Array.isArray(parsed)) restored = parsed.filter((item) => item && item.dataBase64).map((item) => {
					const b64 = String(item.dataBase64 || "");
					const mime = String(item.mimeType || "image/jpeg");
					return {
						name: item.name || "screenshot.jpg",
						mimeType: mime,
						dataBase64: b64,
						sizeBytes: Number(item.sizeBytes || 0),
						previewUrl: b64.startsWith("data:") ? b64 : `data:${mime};base64,${b64}`
					};
				});
			} catch {
				restored = [];
			}
			chatAttachmentsBySession.set(sid, restored);
		}
		return chatAttachmentsBySession.get(sid);
	}
	function clearChatAttachmentList(sessionId = "") {
		const sid = resolveChatAttachmentSessionKey(sessionId);
		chatAttachmentsBySession.set(sid, []);
		try {
			if (sid && sid !== "_default") sessionStorage.removeItem(composerAttachmentDraftKey(sid));
		} catch {}
	}
	function triggerImagePicker(target = "chat") {
		if (target === "chat") {
			const curSess = findSessionGlobal(activeSessionId)?.session;
			if (curSess && curSess.controlMode === "observe-only" && curSess.harness !== "dsh") {
				showToast("👀 当前会话为观察模式（仅支持查看对话记录）");
				return;
			}
		}
		imagePickerActiveUntil = Date.now() + 9e4;
		const inputId = target === "newTask" ? "newTaskImageInput" : "chatImageInput";
		const el = document.getElementById(inputId);
		if (el) {
			el.value = "";
			el.click();
		}
	}
	function renderAttachmentStrip(target = "chat") {
		const stripId = target === "newTask" ? "newTaskAttachmentsStrip" : "composerAttachmentsStrip";
		const strip = document.getElementById(stripId);
		if (!strip) return;
		const list = getAttachmentList(target);
		if (target === "chat") {
			const card = document.getElementById("composerUnifiedCard");
			if (card && card.classList) card.classList.toggle("has-attachments", list.length > 0);
		}
		if (!list.length || target === "chat" && desktopStageMode === "code") {
			strip.style.display = "none";
			strip.innerHTML = "";
			return;
		}
		strip.style.display = "flex";
		strip.innerHTML = list.map((item, idx) => `
        <div class="attachment-thumb-item">
          <img class="attachment-thumb-img" src="${esc$1(item.previewUrl)}" alt="${esc$1(item.name)}" />
          <span class="attachment-thumb-meta">${esc$1(formatBytes(item.sizeBytes || 0))}</span>
          <button
            type="button"
            class="attachment-thumb-remove"
            title="移除截图"
            onclick="removeComposerAttachment('${target === "newTask" ? "newTask" : "chat"}', ${idx})"
          >✕</button>
        </div>
      `).join("");
	}
	function removeComposerAttachment(target = "chat", index = 0) {
		const list = getAttachmentList(target);
		if (index >= 0 && index < list.length) list.splice(index, 1);
		if (target === "chat") persistChatAttachmentsDraft();
		renderAttachmentStrip(target);
	}
	async function addFilesToComposer(files, target = "chat") {
		const list = getAttachmentList(target);
		const candidates = Array.from(files || []).filter((f) => f && (f.type && f.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(f.name || "")));
		if (!candidates.length) {
			showToast("⚠️ 请选择 PNG / JPG / WebP 截图或照片");
			return;
		}
		const remaining = MAX_COMPOSER_ATTACHMENTS - list.length;
		if (remaining <= 0) {
			showToast(`⚠️ 单次最多附带 ${MAX_COMPOSER_ATTACHMENTS} 张截图`);
			return;
		}
		const selected = candidates.slice(0, remaining);
		let addedCount = 0;
		let totalSize = 0;
		for (const file of selected) try {
			const compressed = await compressImageFile(file);
			if (compressed && compressed.dataBase64) {
				list.push(compressed);
				addedCount += 1;
				totalSize += compressed.sizeBytes || 0;
			}
		} catch (err) {
			showToast("❌ 处理图片失败：" + (err?.message || err));
		}
		if (target === "chat") persistChatAttachmentsDraft();
		renderAttachmentStrip(target);
		if (addedCount > 0) showToast(`🖼️ 已添加 ${addedCount} 张截图（已自动优化至 ${formatBytes(totalSize)}）`);
	}
	async function onChatImageSelected(event, target = "chat") {
		imagePickerActiveUntil = 0;
		const files = event?.target?.files;
		if (files && files.length > 0) await addFilesToComposer(files, target);
		if (event?.target) event.target.value = "";
	}
	async function onComposerPaste(event, target = "chat") {
		const items = event?.clipboardData?.items;
		if (!items) return;
		const imageFiles = [];
		for (const item of Array.from(items)) if (item.kind === "file" && item.type && item.type.startsWith("image/")) {
			const file = item.getAsFile();
			if (file) imageFiles.push(file);
		}
		if (imageFiles.length > 0) {
			event.preventDefault();
			await addFilesToComposer(imageFiles, target);
		}
	}
	window.addEventListener("pagehide", () => {
		persistComposerDraft();
		stopVoiceInput();
		closeSSE();
	});
	window.addEventListener("beforeunload", () => {
		closeSSE();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			persistComposerDraft();
			stopVoiceInput();
		} else if (document.visibilityState === "visible") {
			fetchState();
			if (!sseConnected || Date.now() - lastSseEventAt > 15e3) connectSSE();
		}
	});
	async function cancelQueuedCommand(cmdId) {
		if (!cmdId) return;
		try {
			const data = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`, { method: "DELETE" })).json().catch(() => ({}));
			if (data?.ok) {
				const optMap = ensureOptimisticMsgsMap();
				for (const sid of Object.keys(optMap)) {
					optMap[sid] = (optMap[sid] || []).filter((item) => item.cmdId !== cmdId);
					if (optMap[sid].length === 0) delete optMap[sid];
				}
				persistOptimisticMsgsMap();
				showToast("🗑️ 已取消排队中的指令");
			} else showToast("⚠️ " + (data?.error || "该指令已执行或不存在"));
		} catch (err) {
			showToast("❌ 取消失败：" + (err?.message || err));
		}
		fetchState();
	}
	async function sendPromptToActiveSession() {
		const initialTargetSessionId = activeSessionId;
		if (isDictationActiveFor("globalPromptInput")) await flushVoiceInputBeforeSend("globalPromptInput");
		else stopVoiceInput();
		clearTimeout(composerDraftTimer);
		composerDraftTimer = null;
		const input = document.getElementById("globalPromptInput");
		const targetSessionId = initialTargetSessionId || activeSessionId;
		if (!targetSessionId) return;
		if (input && composerUsesCoarsePointer() && typeof document !== "undefined" && document.activeElement === input && typeof input.blur === "function") try {
			input.blur();
		} catch {}
		const rawText = input ? input.value.trim() : "";
		const pendingAttachments = getAttachmentList("chat", targetSessionId).slice();
		if (!rawText && pendingAttachments.length === 0) return;
		const found = findSessionGlobal(targetSessionId);
		if (!found) return;
		const { session: s, host } = found;
		const canSteer = s.capabilities?.canSteer !== false && s.harness !== "claude";
		if (s.status === "running" && !canSteer) {
			showToast("⏳ 当前会话正在运行且不支持中途插话，请等待完成或先点击停止");
			return;
		}
		const text = rawText || "请查看我上传的截图并帮我分析处理。";
		const optimisticText = pendingAttachments.length > 0 ? `${text}\n[🖼️ 已附带 ${pendingAttachments.length} 张截图]` : text;
		lastSentComposerGuard = {
			sessionId: s.id,
			text: rawText || text,
			at: Date.now()
		};
		if (input && (!composerSessionId || composerSessionId === s.id)) input.value = "";
		clearChatAttachmentList(s.id);
		clearComposerDraft(s.id);
		if (composerSessionId && composerSessionId !== s.id) {
			clearChatAttachmentList(composerSessionId);
			clearComposerDraft(composerSessionId);
		}
		renderAttachmentStrip("chat");
		autoGrowComposer();
		if (consumeReturnToVoiceAfterSend()) setWechatVoiceMode(true, false, false);
		const clientCmdId = `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		const optMap = ensureOptimisticMsgsMap();
		const wireTr = Array.isArray(s._wireTranscript) ? s._wireTranscript : [];
		const probeOpt = {
			text: optimisticText,
			rawText: text
		};
		const baselineSameUserCount = wireTr.filter((m) => m && m.role === "user" && matchesOptimisticUserText(m.text, probeOpt)).length;
		const baselineTotalCount = Number(s._wireTotalCount) || wireTr.length;
		const optEntry = {
			id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			cmdId: clientCmdId,
			text: optimisticText,
			rawText: text,
			time: Date.now(),
			baselineSameUserCount,
			baselineTotalCount
		};
		if (pendingAttachments.length > 0) {
			const localThumbs = pendingAttachments.map((a, idx) => ({
				name: a.name || `screenshot-${idx + 1}.jpg`,
				mime: a.mimeType || "image/jpeg",
				size: Number(a.sizeBytes || 0),
				dataBase64: String(a.dataBase64 || "").replace(/^data:[^;]+;base64,/, ""),
				dataUrl: a.previewUrl || (a.dataBase64 ? String(a.dataBase64).startsWith("data:") ? a.dataBase64 : `data:${a.mimeType || "image/jpeg"};base64,${a.dataBase64}` : "")
			})).filter((x) => x.dataUrl);
			if (localThumbs.length > 0) {
				optimisticPreviewImagesByOptId.set(optEntry.id, localThumbs);
				if (optimisticPreviewImagesByOptId.size > 24) {
					const oldestKey = optimisticPreviewImagesByOptId.keys().next().value;
					if (oldestKey) optimisticPreviewImagesByOptId.delete(oldestKey);
				}
			}
		}
		const optList = optMap[s.id] || [];
		optList.push(optEntry);
		optMap[s.id] = optList.slice(-8);
		persistOptimisticMsgsMap();
		chatPinnedToBottom = true;
		lastRenderedChatKey = "";
		renderActiveChatStage();
		const cmdType = s.status === "running" ? "steer" : "prompt";
		const isHostActivelyOnline = Boolean(host && host.online !== false && host.activelyConnected !== false);
		saveInflightOutboxEntry({
			cmdId: clientCmdId,
			hostId: s.hostId,
			sessionId: s.id,
			rawText,
			text,
			baselineSameUserCount,
			baselineTotalCount,
			savedAt: Date.now(),
			attachments: pendingAttachments.map((a) => ({
				name: a.name,
				mimeType: a.mimeType,
				dataBase64: a.dataBase64,
				sizeBytes: Number(a.sizeBytes || 0)
			}))
		});
		if (isHostActivelyOnline) showToast(pendingAttachments.length > 0 ? `⏳ 正在上传截图并发送 (${pendingAttachments.length} 张)…` : cmdType === "steer" ? "⚡ 已发送实时插话" : "📨 已发送指令");
		let dispatchRes = null;
		let transportException = false;
		const chosenChatModel = selectedSessionModels[s.id] || "";
		try {
			dispatchRes = await dispatchHostCommand(s.hostId, {
				id: clientCmdId,
				type: cmdType,
				agentId: s.id,
				cwd: s.cwd || "",
				text,
				prompt: text,
				...chosenChatModel ? { model: chosenChatModel } : {},
				...pendingAttachments.length > 0 ? { attachments: pendingAttachments.map((a) => ({
					name: a.name,
					mimeType: a.mimeType,
					dataBase64: a.dataBase64
				})) } : {}
			});
		} catch (err) {
			transportException = true;
			dispatchRes = {
				ok: false,
				error: err?.message || "网络请求失败"
			};
		}
		if (!dispatchRes || dispatchRes.ok === false) {
			if (transportException) await fetchState({
				silent: true,
				forceFresh: true
			}).catch(() => null);
			const latestFound = findSessionGlobal(s.id);
			if (latestFound && hasCommandOrPromptDelivered(latestFound.session, latestFound.host, clientCmdId, text, baselineSameUserCount, baselineTotalCount)) {
				removeInflightOutboxEntry(clientCmdId);
				clearComposerDraft(s.id);
				scheduleFallbackStateSync();
				return;
			}
			removeInflightOutboxEntry(clientCmdId);
			optMap[s.id] = (optMap[s.id] || []).filter((item) => item.id !== optEntry.id);
			persistOptimisticMsgsMap();
			lastRenderedChatKey = "";
			renderActiveChatStage();
			showToast("❌ " + (dispatchRes?.error || "发送指令失败"));
			if (rawText) {
				writeComposerDraftValue(s.id, rawText, {
					wireSameCount: baselineSameUserCount,
					wireTotalCount: baselineTotalCount,
					savedAt: Date.now(),
					fromErrorRestore: true,
					cmdId: clientCmdId
				});
				if (input && (composerSessionId === s.id || activeSessionId === s.id) && !input.value.trim()) {
					input.value = rawText;
					autoGrowComposer();
				}
			}
			const curSessionList = getAttachmentList("chat", s.id);
			if (pendingAttachments.length > 0 && curSessionList.length === 0) {
				curSessionList.push(...pendingAttachments);
				persistChatAttachmentsDraft(s.id);
				if (activeSessionId === s.id) renderAttachmentStrip("chat");
			}
			return;
		}
		removeInflightOutboxEntry(clientCmdId);
		if (dispatchRes.queued) showToast("⏳ 电脑当前休眠/离线，指令已排队（10分钟内上线自动执行，可随时取消）");
		else if (pendingAttachments.length > 0) showToast(`🖼️ 已发送截图与指令 (${pendingAttachments.length} 张)`);
		const cmdId = dispatchRes?.command?.id || clientCmdId;
		if (cmdId) {
			optEntry.cmdId = cmdId;
			persistOptimisticMsgsMap();
		}
		scheduleFallbackStateSync();
		if (cmdId) (async () => {
			for (let i = 0; i < 16; i++) {
				await new Promise((r) => setTimeout(r, 350));
				try {
					const data = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`)).json();
					if (data?.ready || data?.command?.status === "completed") {
						if (data.result && data.result.ok === false) {
							optMap[s.id] = (optMap[s.id] || []).filter((item) => item.id !== optEntry.id);
							persistOptimisticMsgsMap();
							lastRenderedChatKey = "";
							renderActiveChatStage();
							showToast("❌ " + (data.result.error || data.result.message || "发送失败"));
							if (rawText) {
								writeComposerDraftValue(s.id, rawText, {
									wireSameCount: baselineSameUserCount,
									wireTotalCount: baselineTotalCount,
									savedAt: Date.now(),
									fromErrorRestore: false,
									cmdId: ""
								});
								if (input && (composerSessionId === s.id || activeSessionId === s.id) && !input.value.trim()) {
									input.value = rawText;
									autoGrowComposer();
								}
							}
							const curSessionList = getAttachmentList("chat", s.id);
							if (pendingAttachments.length > 0 && curSessionList.length === 0) {
								curSessionList.push(...pendingAttachments);
								persistChatAttachmentsDraft(s.id);
								if (activeSessionId === s.id) renderAttachmentStrip("chat");
							}
						}
						scheduleFallbackStateSync();
						return;
					}
				} catch {}
			}
		})();
	}
	function sendQuickFollowup(text) {
		document.getElementById("globalPromptInput").value = text;
		sendPromptToActiveSession();
	}
	async function stopActiveSession() {
		const found = findSessionGlobal(activeSessionId);
		if (!found) return;
		showToast("⏹ 正在停止任务...");
		await dispatchHostCommand(found.session.hostId, {
			type: "stop",
			agentId: found.session.id
		});
		scheduleFallbackStateSync();
	}
	async function sendApprovalDecision(hostId, code, allow, optionIndex = 1, explicitAgentId = "") {
		window.__dshSettlingApprovals = window.__dshSettlingApprovals || {};
		if (code) window.__dshSettlingApprovals[code] = {
			at: Date.now(),
			decision: allow ? "approve" : "deny"
		};
		renderAll();
		showToast(optionIndex === 2 ? "⏳ 正在同步：批准并在当前会话始终允许" : optionIndex === 3 ? "⏳ 正在同步：批准并始终允许该命令" : allow ? "⏳ 正在同步批准指令到电脑端..." : "⏳ 正在同步拒绝指令到电脑端...");
		try {
			const res = await dispatchHostCommand(hostId, {
				type: "approval",
				code,
				agentId: explicitAgentId || activeSessionId || void 0,
				allow: Boolean(allow),
				optionIndex: Number(optionIndex) || (allow ? 1 : 4)
			});
			if (!res || res.ok === false) {
				if (res?.conflict && code && window.__dshSettlingApprovals) {
					window.__dshSettlingApprovals[code] = {
						at: Date.now(),
						decision: res.existingDecision || (allow ? "approve" : "deny")
					};
					lastRenderedChatKey = "";
					renderAll();
					showToast("⚠️ " + (res.error || "当前审批正在同步另一项决定"));
					return;
				}
				if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
				lastRenderedChatKey = "";
				renderAll();
				showToast("❌ 审批发送失败：" + (res?.error || "请重试"));
				return;
			}
		} catch (err) {
			if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
			lastRenderedChatKey = "";
			renderAll();
			showToast("❌ 审批发送异常：" + (err?.message || err));
			return;
		}
		scheduleFallbackStateSync();
	}
	function getDshQuestionDraft(code, questions = []) {
		window.__dshQuestionDrafts = window.__dshQuestionDrafts || {};
		const key = String(code || "default");
		if (!window.__dshQuestionDrafts[key]) {
			const init = {};
			(Array.isArray(questions) ? questions : []).forEach((q, idx) => {
				const qId = String(q.id || `q_${idx + 1}`);
				const firstOpt = Array.isArray(q.options) && q.options[0]?.label ? [String(q.options[0].label)] : [];
				init[qId] = {
					selected: q.multiSelect ? [] : firstOpt,
					customText: ""
				};
			});
			window.__dshQuestionDrafts[key] = init;
		}
		return window.__dshQuestionDrafts[key];
	}
	function toggleDshQuestionOption(code, qId, label, multiSelect = false) {
		const draft = getDshQuestionDraft(code, findSessionGlobal(activeSessionId)?.session?.approvalObj?.questions || []);
		const key = String(qId || "q_1");
		if (!draft[key]) draft[key] = {
			selected: [],
			customText: ""
		};
		const cur = Array.isArray(draft[key].selected) ? [...draft[key].selected] : [];
		if (multiSelect) {
			const idx = cur.indexOf(label);
			if (idx >= 0) cur.splice(idx, 1);
			else cur.push(label);
			draft[key].selected = cur;
		} else draft[key].selected = [label];
		const card = document.querySelector(`.dsh-question-card[data-question-code="${CSS.escape(String(code))}"]`);
		if (card) card.querySelectorAll(`.dsh-question-opt[data-q-id="${CSS.escape(key)}"]`).forEach((btn) => {
			const optLabel = btn.getAttribute("data-opt-label") || "";
			const isSel = draft[key].selected.includes(optLabel);
			btn.classList.toggle("selected", isSel);
			const checkEl = btn.querySelector(".dsh-question-opt-check");
			if (checkEl) checkEl.textContent = multiSelect ? isSel ? "☑" : "☐" : isSel ? "◉" : "○";
		});
		else {
			lastRenderedChatKey = "";
			renderActiveChatStage();
		}
	}
	function onDshQuestionCustomInput(code, qId, val) {
		const draft = getDshQuestionDraft(code, findSessionGlobal(activeSessionId)?.session?.approvalObj?.questions || []);
		const key = String(qId || "q_1");
		if (!draft[key]) draft[key] = {
			selected: [],
			customText: ""
		};
		draft[key].customText = String(val ?? "");
	}
	async function submitDshQuestionAnswers(hostId, code, explicitAgentId = "") {
		const targetSessionId = explicitAgentId || activeSessionId || "";
		const appObj = findSessionGlobal(targetSessionId)?.session?.approvalObj;
		const questions = Array.isArray(appObj?.questions) ? appObj.questions : [];
		const draft = getDshQuestionDraft(code, questions);
		const answers = {};
		questions.forEach((q, idx) => {
			const qId = String(q.id || `q_${idx + 1}`);
			const item = draft[qId] || {
				selected: [],
				customText: ""
			};
			const picked = Array.isArray(item.selected) ? item.selected.filter(Boolean) : [];
			const custom = String(item.customText || "").trim();
			const combined = [...picked];
			if (custom) combined.push(custom);
			if (combined.length === 0 && Array.isArray(q.options) && q.options[0]?.label) combined.push(String(q.options[0].label));
			answers[qId] = q.multiSelect ? combined : combined[0] || "";
		});
		window.__dshSettlingApprovals = window.__dshSettlingApprovals || {};
		if (code) window.__dshSettlingApprovals[code] = {
			at: Date.now(),
			decision: "approve"
		};
		lastRenderedChatKey = "";
		renderAll();
		showToast("⏳ 正在将你的选择同步到电脑端...");
		try {
			const res = await dispatchHostCommand(hostId, {
				type: "approval",
				code,
				agentId: targetSessionId || void 0,
				allow: true,
				optionIndex: 1,
				answers
			});
			if (!res || res.ok === false) {
				if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
				lastRenderedChatKey = "";
				renderAll();
				showToast("❌ 提交选择失败：" + (res?.error || "请重试"));
				return;
			}
		} catch (err) {
			if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
			lastRenderedChatKey = "";
			renderAll();
			showToast("❌ 提交选择异常：" + (err?.message || err));
			return;
		}
		scheduleFallbackStateSync();
	}
	const FILES_CARD_STATE_KEY = "dsh_files_card_state_v1";
	const artifactsExpandedSessionIds = /* @__PURE__ */ new Set();
	const filesExpandedSessionIds = /* @__PURE__ */ new Set();
	const filesCardReviewedSigBySession = /* @__PURE__ */ new Map();
	let drawerChangedFilesSessionId = null;
	(function restoreFilesCardState() {
		try {
			const raw = JSON.parse(localStorage.getItem(FILES_CARD_STATE_KEY) || "{}");
			if (raw && typeof raw === "object" && raw.reviewed && typeof raw.reviewed === "object") {
				for (const [k, v] of Object.entries(raw.reviewed)) if (typeof v === "string" && v) filesCardReviewedSigBySession.set(k, v);
			}
		} catch {}
	})();
	function persistFilesCardState() {
		try {
			const reviewed = {};
			Array.from(filesCardReviewedSigBySession.entries()).slice(-60).forEach(([k, v]) => {
				reviewed[k] = v;
			});
			localStorage.setItem(FILES_CARD_STATE_KEY, JSON.stringify({ reviewed }));
		} catch {}
	}
	function computeChangedFilesMeta(changedFiles) {
		if (!Array.isArray(changedFiles) || changedFiles.length === 0) return {
			totalAdd: 0,
			totalDel: 0,
			sig: ""
		};
		let totalAdd = 0;
		let totalDel = 0;
		const names = [];
		for (const fc of changedFiles) {
			totalAdd += Number(fc?.added || 0);
			totalDel += Number(fc?.removed || 0);
			if (fc?.name) names.push(fc.name);
		}
		return {
			totalAdd,
			totalDel,
			sig: `${changedFiles.length}:${totalAdd}:${totalDel}:${names.slice(-3).join(",")}`
		};
	}
	function toggleSessionArtifactsCard(sessionId) {
		const sid = String(sessionId || activeSessionId || "");
		if (!sid) return;
		if (artifactsExpandedSessionIds.has(sid)) artifactsExpandedSessionIds.delete(sid);
		else artifactsExpandedSessionIds.add(sid);
		lastRenderedChatKey = "";
		renderActiveChatStage();
	}
	function toggleFilesChangedCard(sessionId) {
		const sid = String(sessionId || activeSessionId || "");
		if (!sid) return;
		if (filesExpandedSessionIds.has(sid)) filesExpandedSessionIds.delete(sid);
		else filesExpandedSessionIds.add(sid);
		lastRenderedChatKey = "";
		renderActiveChatStage();
	}
	function reviewFilesChangedCard(sessionId, sig) {
		const sid = String(sessionId || activeSessionId || "");
		if (!sid) return;
		const found = findSessionGlobal(sid);
		const files = Array.isArray(found?.session?.changedFiles) ? found.session.changedFiles : [];
		const effectiveSig = String(sig || computeChangedFilesMeta(files).sig || "");
		if (!effectiveSig) return;
		filesCardReviewedSigBySession.set(sid, effectiveSig);
		filesExpandedSessionIds.delete(sid);
		persistFilesCardState();
		lastRenderedChatKey = "";
		renderActiveChatStage();
		showToast(`✅ 已确认 ${files.length} 个文件改动`);
	}
	function openChangedFilesDrawer(sessionId) {
		const found = findSessionGlobal(String(sessionId || activeSessionId || ""));
		if (!found) return;
		if (found.host) {
			delete pinnedDrawerPreviewByHost[found.host.hostId];
			if (found.host.lastFilePreview) found.host.lastFilePreview._showInDrawer = false;
		}
		filePreviewLoading = null;
		fileProjectCwd = found.session.cwd || "";
		drawerChangedFilesSessionId = found.session.id;
		openSheet("inChatFileSheet");
		document.body.classList.add("mobile-file-open");
		const titleEl = document.getElementById("inChatFileTitle");
		if (titleEl) titleEl.textContent = `📝 ${found.session.project} · 改动文件 (${(found.session.changedFiles || []).length})`;
		renderInChatFileDrawerBody();
	}
	async function openInChatFileDrawer() {
		const found = findSessionGlobal(activeSessionId);
		if (!found) return;
		drawerChangedFilesSessionId = null;
		if (found.host) {
			delete pinnedDrawerPreviewByHost[found.host.hostId];
			if (found.host.lastFilePreview) found.host.lastFilePreview._showInDrawer = false;
		}
		filePreviewLoading = null;
		fileProjectCwd = found.session.cwd || "";
		openSheet("inChatFileSheet");
		document.body.classList.add("mobile-file-open");
		document.getElementById("inChatFileTitle").textContent = `📂 ${found.session.project} (${found.session.hostName})`;
		await requestDirList(found.session.hostId, found.session.id, fileProjectCwd, "", true);
	}
	function toWorkspaceRelPath(cwd, rawPath) {
		let clean = String(rawPath || "").replace(/^file:\/\//i, "").replace(/#L\d+(?:-L?\d+)?$/i, "").trim();
		const cleanCwd = String(cwd || "").replace(/\/+$/, "").trim();
		if (cleanCwd && clean.startsWith(cleanCwd + "/")) return clean.slice(cleanCwd.length + 1);
		return clean;
	}
	async function openChatFileLink(encodedPath) {
		let rawPath = String(encodedPath || "").trim();
		try {
			rawPath = decodeURIComponent(rawPath);
		} catch {}
		if (!rawPath) return;
		const found = findSessionGlobal(!document.getElementById("chatFullscreen")?.classList.contains("open") && triageCtrl?.isOpen() && triageCtrl?.getTopSessionId?.() || activeSessionId);
		if (!found) return;
		const sessionArts = Array.isArray(found.session.artifacts) ? found.session.artifacts : [];
		const cleanLookup = rawPath.replace(/^file:\/\//i, "").replace(/#L\d+(?:-L?\d+)?$/i, "").trim();
		if (!cleanLookup.startsWith("/") && sessionArts.length > 0) {
			const matchedArt = sessionArts.find((a) => a?.path && (a.name?.toLowerCase() === cleanLookup.toLowerCase() || a.path.endsWith("/" + cleanLookup)));
			if (matchedArt?.path) rawPath = matchedArt.path;
		}
		fileProjectCwd = found.session.cwd || "";
		const relPath = toWorkspaceRelPath(fileProjectCwd, rawPath);
		const baseName = relPath.split("/").filter(Boolean).pop() || relPath || "file";
		openSheet("inChatFileSheet");
		document.body.classList.add("mobile-file-open");
		const titleEl = document.getElementById("inChatFileTitle");
		if (titleEl) titleEl.textContent = `📂 ${found.session.project} (${found.session.hostName})`;
		if (/\.(blend|blend1|fbx|obj|glb|gltf|dae|abc|usd|usdz|zip|tar|gz|dmg|pkg)$/i.test(baseName)) {
			const ext = "." + (baseName.split(".").pop() || "").toLowerCase();
			found.host.lastFilePreview = {
				at: Date.now(),
				agentId: found.session.id,
				relPath,
				name: baseName,
				ext,
				size: 0,
				kind: "binary",
				mime: "application/octet-stream",
				_showInDrawer: true,
				_showInMain: false
			};
			pinnedDrawerPreviewByHost[found.session.hostId] = found.host.lastFilePreview;
			filePreviewLoading = null;
			renderInChatFileDrawerBody();
			return;
		}
		await clickRealFileEntry(found.session.hostId, found.session.id, fileProjectCwd, relPath, false, true);
	}
	async function hydrateInlineChatImages(session, containerEl) {
		if (!session || !containerEl) return;
		const mt = hubState.mediaTicket || "";
		const sessionArts = Array.isArray(session.artifacts) ? session.artifacts : [];
		const resolveLocalRelPath = (rawLocalPath) => {
			let target = String(rawLocalPath || "").trim();
			if (!target.startsWith("/") && sessionArts.length > 0) {
				const matched = sessionArts.find((a) => a?.path && (a.name?.toLowerCase() === target.toLowerCase() || a.path.endsWith("/" + target)));
				if (matched?.path) target = matched.path;
			}
			return toWorkspaceRelPath(session.cwd || "", target);
		};
		const pendingVideos = Array.from(containerEl.querySelectorAll(".md-local-video-pending[data-local-video-path]"));
		if (pendingVideos.length > 0) {
			window.__dshInlineVideoCache = window.__dshInlineVideoCache || {};
			for (const vNode of pendingVideos) {
				const vPath = vNode.getAttribute("data-local-video-path") || "";
				if (!vPath) continue;
				const relPath = resolveLocalRelPath(vPath);
				const baseName = relPath.split("/").filter(Boolean).pop() || "video.mp4";
				const encodedPath = encodeURIComponent(vPath).replace(/'/g, "%27");
				const vFallbackSrc = buildFastStreamUrl(session.hostId, relPath, {
					cwd: session.cwd || "",
					agentId: session.id || "",
					mediaTicket: mt
				});
				const vHlsSrc = vFallbackSrc.replace("/fs/stream?", "/fs/hls/index.m3u8?");
				window.__dshInlineVideoCache[vPath] = vFallbackSrc;
				vNode.classList.remove("md-local-video-pending");
				vNode.removeAttribute("onclick");
				vNode.innerHTML = `<video class="md-inline-video" data-hls-src="${vHlsSrc}" data-fallback-src="${vFallbackSrc}" controls playsinline webkit-playsinline preload="none" onplay="mountSmartVideoElement(this)" onloadedmetadata="onSmartVideoLoadedMeta(this)" onerror="onSmartVideoError(this)"></video><span class="md-inline-img-cap" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')">🎬 ${esc$1(baseName)} · 点此打开大屏预览</span>`;
			}
		}
		const pendingUserNodes = Array.from(containerEl.querySelectorAll(".md-user-img-pending[data-local-img-path]"));
		for (const uNode of pendingUserNodes) {
			const primaryPath = uNode.getAttribute("data-local-img-path") || "";
			const backupPath = uNode.getAttribute("data-backup-img-path") || "";
			const label = uNode.getAttribute("data-img-label") || "image";
			if (!primaryPath) continue;
			const relPrimary = resolveLocalRelPath(primaryPath);
			const isLosslessAnim = /\.(svg|gif)$/i.test(label);
			const primarySrc = buildFastStreamUrl(session.hostId, relPrimary, {
				cwd: session.cwd || "",
				agentId: session.id || "",
				thumb: !isLosslessAnim,
				mediaTicket: mt
			});
			const backupSrc = backupPath ? buildFastStreamUrl(session.hostId, resolveLocalRelPath(backupPath), {
				cwd: session.cwd || "",
				agentId: session.id || "",
				thumb: !isLosslessAnim,
				mediaTicket: mt
			}) : "";
			uNode.classList.remove("md-user-img-pending");
			uNode.dataset.activeImgPath = primaryPath;
			uNode.innerHTML = `<img class="user-msg-thumb saveable-preview-img" src="${primarySrc}" data-fallback-src="${backupSrc}" data-backup-path="${esc$1(backupPath)}" alt="${esc$1(label)}" loading="lazy" onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){const card=this.closest('.user-msg-img-card');if(card&&this.dataset.backupPath)card.dataset.activeImgPath=this.dataset.backupPath;this.src=this.dataset.fallbackSrc;}else{this.style.display='none';}" /><span class="user-msg-img-badge">🔍 ${esc$1(label)}</span>`;
		}
		const pendingNodes = Array.from(containerEl.querySelectorAll(".md-local-img-pending[data-local-img-path]"));
		if (pendingNodes.length === 0) return;
		window.__dshInlineImgCache = window.__dshInlineImgCache || {};
		for (const node of pendingNodes) {
			const imgPath = node.getAttribute("data-local-img-path") || "";
			if (!imgPath) continue;
			const relPath = resolveLocalRelPath(imgPath);
			const baseName = relPath.split("/").filter(Boolean).pop() || "image";
			const isLosslessAnim = /\.(svg|gif)$/i.test(baseName);
			const srcUrl = buildFastStreamUrl(session.hostId, relPath, {
				cwd: session.cwd || "",
				agentId: session.id || "",
				thumb: !isLosslessAnim,
				mediaTicket: mt
			});
			window.__dshInlineImgCache[imgPath] = srcUrl;
			node.classList.remove("md-local-img-pending");
			node.innerHTML = `<img class="md-inline-img" src="${srcUrl}" alt="${esc$1(baseName)}" loading="lazy" />`;
		}
	}
	function openOptimisticImagePreview(optId, idx = 0) {
		const list = optimisticPreviewImagesByOptId.get(String(optId || ""));
		const item = Array.isArray(list) ? list[Number(idx) || 0] : null;
		const found = findSessionGlobal(activeSessionId);
		if (!item || !found?.host) return;
		drawerChangedFilesSessionId = null;
		filePreviewLoading = null;
		found.host.lastFilePreview = {
			at: Date.now(),
			agentId: found.session.id,
			relPath: item.name,
			name: item.name,
			kind: "image",
			mime: item.mime || "image/jpeg",
			size: item.size || 0,
			dataBase64: item.dataBase64,
			_showInDrawer: true,
			_showInMain: false
		};
		pinnedDrawerPreviewByHost[found.host.hostId] = found.host.lastFilePreview;
		openSheet("inChatFileSheet");
		document.body.classList.add("mobile-file-open");
		const titleEl = document.getElementById("inChatFileTitle");
		if (titleEl) titleEl.textContent = `🖼️ ${item.name}`;
		renderInChatFileDrawerBody();
	}
	async function openUserBubbleImage(cardEl, encodedPrimary, encodedBackup = "") {
		const activeRaw = cardEl?.dataset?.activeImgPath || "";
		let primary = "";
		let backup = "";
		try {
			primary = decodeURIComponent(String(encodedPrimary || ""));
		} catch {
			primary = String(encodedPrimary || "");
		}
		try {
			backup = decodeURIComponent(String(encodedBackup || ""));
		} catch {
			backup = String(encodedBackup || "");
		}
		const firstChoice = activeRaw || primary || backup;
		const secondChoice = firstChoice === primary && backup ? backup : firstChoice === backup && primary ? primary : "";
		if (!firstChoice) return;
		await openChatFileLink(encodeURIComponent(firstChoice));
		const found = findSessionGlobal(activeSessionId);
		const curPreview = found?.host ? pinnedDrawerPreviewByHost[found.host.hostId] : null;
		if (secondChoice && (!curPreview || curPreview.error)) await openChatFileLink(encodeURIComponent(secondChoice));
	}
	const previewTextCache = /* @__PURE__ */ new Map();
	async function ensureTextPreviewLoaded(hostId, preview) {
		if (!preview || preview.content !== void 0 || !preview.hasBlob || previewKind(preview) !== "text") return;
		const cacheKey = `${hostId}:${preview.at}`;
		if (previewTextCache.has(cacheKey)) {
			preview.content = previewTextCache.get(cacheKey);
			return;
		}
		previewTextCache.set(cacheKey, "正在按需加载大文本预览…");
		try {
			const content = (await (await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/file-preview?at=${encodeURIComponent(preview.at || 0)}&format=json`)).json().catch(() => ({})))?.preview?.content ?? "（预览已过期，请重新点击文件加载）";
			previewTextCache.set(cacheKey, content);
			preview.content = content;
			renderAll();
			renderFilePanes();
		} catch {
			previewTextCache.delete(cacheKey);
		}
	}
	async function ensureHtmlPreviewFullLoaded(hostId, preview) {
		if (!preview || !isHtmlFileName(preview.name || preview.relPath || "")) return;
		await ensureTextPreviewLoaded(hostId, preview);
		if (preview._fullHtmlFetched) return;
		const rawContent = String(preview.content || "");
		const utf8ByteLen = rawContent && typeof TextEncoder !== "undefined" ? new TextEncoder().encode(rawContent).length : rawContent.length;
		if (!(Boolean(preview.streamUrl) && (!preview.size || preview.size <= 5242880) && (Boolean(preview.truncated) || !rawContent || rawContent.includes("文件过大已截断") || typeof preview.size === "number" && preview.size > utf8ByteLen + 64))) return;
		preview._fullHtmlFetched = true;
		try {
			const res = await apiFetch(preview.streamUrl);
			if (res.ok) {
				const fullText = await res.text();
				if (fullText) {
					preview.content = fullText;
					preview.kind = "text";
					preview.truncated = false;
					renderAll();
					renderFilePanes();
				}
			}
		} catch {
			preview._fullHtmlFetched = false;
		}
	}
	function renderInChatFileDrawerBody() {
		const found = findSessionGlobal(activeSessionId);
		if (!found) return;
		const host = found.host;
		if (!host) return;
		const body = document.getElementById("inChatFileBody");
		reconcileFileLoading(host);
		const preview = pinnedDrawerPreviewByHost[host.hostId] || (host.lastFilePreview?._showInDrawer ? host.lastFilePreview : null);
		const listing = host.lastFsListing;
		if (filePreviewLoading && filePreviewLoading.hostId === host.hostId && filePreviewLoading.drawer) {
			body.dataset.dshDrawerListKey = "";
			body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="cancelFilePreviewLoading()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);">${esc$1(String(filePreviewLoading.relPath || "").split("/").filter(Boolean).pop() || "文件")}</span>
            <span style="width:56px;"></span>
          </div>
          <div style="padding:16px 12px;background:#0f172a;min-height:300px;">
            ${fileLoadingSpinnerHtml("正在读取文件内容…")}
          </div>
        `;
			return;
		}
		if (preview && preview._showInDrawer) {
			body.dataset.dshDrawerListKey = "";
			ensureTextPreviewLoaded(host.hostId, preview);
			if (isHtmlFileName(preview.name || preview.relPath || "")) ensureHtmlPreviewFullLoaded(host.hostId, preview);
			const kind = previewKind(preview);
			const mt = hubState.mediaTicket || "";
			const isMarkdown = kind === "text" && /\.(md|markdown|mdx)$/i.test(preview.name || preview.relPath || "");
			const isHtml = kind === "text" && isHtmlFileName(preview.name || preview.relPath || "");
			const rawMdMode = Boolean(window.__dshRawMdPreview);
			const rawHtmlMode = Boolean(window.__dshRawHtmlPreview);
			const previewKey = `${preview.at || 0}:${preview.relPath || ""}:${kind}:${preview._origImage ? 1 : 0}:${preview._transcodeVideo ? 1 : 0}:${preview._rawVideo ? 1 : 0}:${isMarkdown ? rawMdMode ? "raw" : "md" : ""}:${isHtml ? rawHtmlMode ? "raw-html" : "html" : ""}:${(preview.content || "").length}`;
			if (body.dataset.dshPreviewKey === previewKey && body.querySelector(".file-preview-body")) return;
			body.dataset.dshPreviewKey = previewKey;
			const numberedHtml = String(preview.content || "").split("\n").map((line, i) => `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc$1(line)}</span></div>`).join("");
			const canToggleOrigImg = kind === "image" && Boolean(preview.streamUrl) && !/\.(svg|gif)$/i.test(preview.name || "") && (!preview.size || preview.size > 307200);
			const dlUrl = preview.streamUrl ? appendMediaAuth(`${preview.streamUrl}${preview.streamUrl.includes("?") ? "&" : "?"}download=1`, mt) : "";
			const videoMetaUi = kind === "video" ? describeVideoPreviewStatus(preview) : null;
			const htmlSrcdocAttr = isHtml && !rawHtmlMode ? escapeSrcdocAttr(buildSandboxedHtmlSrcdoc(preview.content || "", {
				hostId: host.hostId,
				relPath: preview.relPath || preview.name || "",
				cwd: fileProjectCwd || found.session?.cwd || "",
				agentId: preview.agentId || found.session?.id || "",
				mediaTicket: mt,
				origin: typeof location !== "undefined" ? location.origin : ""
			})) : "";
			const previewBodyHtml = kind === "video" ? `<div class="file-preview-body" style="padding:16px 12px;background:#0f172a;min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
               <video class="file-preview-video" data-hls-src="${esc$1(videoHlsSrc(preview, mt))}" data-fallback-src="${esc$1(videoPreviewSrc(preview, mt))}" data-video-bytes="${Number(preview.size || 0)}" data-dsh-universal-direct="${preview.videoProbe?.universalDirectPlay ? "1" : "0"}" controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="onSmartVideoLoadedMeta(this)" onerror="onSmartVideoError(this)"></video>
               <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">
                 <span data-dsh-video-status="1" style="font-size:12px;color:#94a3b8;">🎬 ${esc$1(formatBytes(preview.size))} · ${esc$1(videoMetaUi.badge)}</span>
                 <button type="button" class="media-toolbar-pill" onclick="switchVideoTranscodeMode('${esc$1(host.hostId)}', true)">${esc$1(videoMetaUi.toggleLabel)}</button>
                 ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc$1(dlUrl)}', '${esc$1(preview.name || "video.mp4")}', this)">⬇️ 保存/分享视频</button>` : ""}
               </div>
             </div>` : kind === "image" ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
                 <img class="saveable-preview-img drawer-preview-img" src="${imagePreviewSrc(preview, mt)}" data-download-url="${esc$1(dlUrl || imagePreviewSrc(preview, mt))}" data-file-name="${esc$1(preview.name || "image.png")}" alt="${esc$1(preview.name)}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.textContent='⚠️ 图片预览已过期，请返回目录重新点击文件加载';" />
                 <div class="file-preview-meta-bar" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#94a3b8;">
                   <span>${esc$1(formatBytes(preview.size))} · 长按或点按钮保存图片</span>
                   <button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc$1(dlUrl || imagePreviewSrc(preview, mt))}', '${esc$1(preview.name || "image.png")}', this)">⬇️ 保存图片</button>
                   ${canToggleOrigImg ? `<button type="button" class="media-toolbar-pill" onclick="toggleOriginalPreviewImage('${esc$1(host.hostId)}', true)">${preview._origImage ? "⚡ 切回智能省流图" : "🔍 查看无损原图"}</button>` : ""}
                 </div>
               </div>` : kind === "binary" ? `<div class="file-preview-body" style="padding:32px 16px;background:#0f172a;color:#94a3b8;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                   <div style="font-size:32px;">📦</div>
                   <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${esc$1(preview.name)}</div>
                   <div style="font-size:12.5px;">二进制文件（${esc$1(formatBytes(preview.size))}），不支持直接文本预览</div>
                   ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc$1(dlUrl)}', '${esc$1(preview.name || "file")}', this)">⬇️ 保存/分享文件</button>` : ""}
                 </div>` : isHtml && !rawHtmlMode ? `<div class="file-preview-body html-sandbox-preview" style="padding:0;background:#ffffff;min-height:420px;">
                   <iframe class="drawer-preview-iframe" title="${esc$1(preview.name || "HTML Preview")}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer" srcdoc="${htmlSrcdocAttr}"></iframe>
                 </div>` : isMarkdown && !rawMdMode ? `<div class="file-preview-body walkthrough-md-preview md-body" style="padding:16px 14px;background:var(--card-bg, #ffffff);color:var(--text, #0f172a);min-height:340px;overflow-x:auto;">
                     ${formatAssistantText(preview.content || "")}
                   </div>` : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:340px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;">
                     ${numberedHtml}
                   </div>`;
			body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;gap:6px;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="backFromDrawerPreview()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(preview.name)}</span>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              ${isHtml ? `<button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="openFullscreenHtmlFromPreview('${esc$1(host.hostId)}', true)">⛶ 全屏体验</button><button class="icon-pill-btn" onclick="toggleHtmlPreviewMode()">${rawHtmlMode ? "🌐 预览" : "</> 源码"}</button>` : ""}
              ${isMarkdown ? `<button class="icon-pill-btn" onclick="toggleMdPreviewMode()">${rawMdMode ? "📖 渲染" : "</> 源码"}</button>` : ""}
              <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="quoteFileIntoChat('${esc$1(preview.relPath || preview.name)}')">📎 引用</button>
            </div>
          </div>
          ${previewBodyHtml}
        `;
			if (isMarkdown && !rawMdMode) hydrateInlineChatImages(found.session, body);
			else if (kind === "video") {
				const vidEl = body.querySelector("video.file-preview-video");
				if (vidEl) mountSmartVideoElement(vidEl);
			}
			return;
		}
		body.dataset.dshPreviewKey = "";
		if (drawerChangedFilesSessionId && drawerChangedFilesSessionId === found.session.id) {
			const files = Array.isArray(found.session.changedFiles) ? found.session.changedFiles : [];
			const changedKey = `changed:${found.session.id}:${files.length}:${computeChangedFilesMeta(files).sig}`;
			if (body.dataset.dshDrawerListKey === changedKey && body.querySelector(".breadcrumbs-bar")) return;
			body.dataset.dshDrawerListKey = changedKey;
			const meta = computeChangedFilesMeta(files);
			body.innerHTML = `
        <div class="breadcrumbs-bar" style="justify-content:space-between;gap:8px;">
          <span style="font-weight:700;color:var(--text);">📝 本会话改动文件 (${files.length}) <span class="agy-file-diff" style="margin-left:6px;"><span class="add">+${meta.totalAdd}</span><span class="del">-${meta.totalDel}</span></span></span>
          <button type="button" class="icon-pill-btn" onclick="openInChatFileDrawer()">📂 浏览全部目录</button>
        </div>
        <div>
          ${files.map((fc) => {
				return `
              <div class="file-row" onclick="openChatFileLink('${encodeURIComponent(fc.path || fc.name || "").replace(/'/g, "%27")}')">
                <div class="file-row-left" style="min-width:0;flex:1;">
                  <span class="agy-file-diff" style="min-width:56px;"><span class="add">+${Number(fc.added || 0)}</span><span class="del">-${Number(fc.removed || 0)}</span></span>
                  <div style="min-width:0;overflow:hidden;">
                    <div style="font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(fc.name || "")}</div>
                    <div style="font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(fc.displayPath || fc.path || "")}</div>
                  </div>
                </div>
                <span style="font-size:12px;color:var(--primary);font-weight:600;flex-shrink:0;">打开 ›</span>
              </div>
            `;
			}).join("") || `<div style="padding:36px;text-align:center;color:var(--muted);">暂无文件改动记录</div>`}
        </div>
      `;
			applyLangToDom(body, langPref);
			return;
		}
		const entries = listing?.entries || [];
		const loadingDir = fileLoading && fileLoading.hostId === host.hostId && fileLoading.drawer;
		const rootCwd = listing?.rootCwd || fileProjectCwd;
		const activeSubDir = loadingDir ? fileLoading.subDir || "" : listing?.subDir || "";
		const drawerListKey = `${host.hostId}:${rootCwd}:${activeSubDir}:${loadingDir ? 1 : 0}:${listing?.at || 0}:${entries.length}`;
		if (body.dataset.dshDrawerListKey === drawerListKey && body.querySelector(".breadcrumbs-bar")) return;
		body.dataset.dshDrawerListKey = drawerListKey;
		const prevScrollTop = body.scrollTop;
		const crumbs = buildBreadcrumbSegments(activeSubDir);
		const hostId = esc$1(host.hostId);
		const sessionId = esc$1(found.session.id);
		body.innerHTML = `
        <div class="breadcrumbs-bar">
          <span class="crumb-link" onclick="requestDirList('${hostId}', '${sessionId}', '${esc$1(rootCwd)}', '', true)">🏠 ${esc$1(found.session.project)}</span>
          ${crumbs.map((c, index) => {
			return "<span style=\"color:#94a3b8;\">/</span>" + (index === crumbs.length - 1 ? `<span style="font-weight:600;color:var(--text);">${esc$1(c.name)}</span>` : `<span class="crumb-link" onclick="requestDirList('${hostId}', '${sessionId}', '${esc$1(rootCwd)}', '${esc$1(c.path)}', true)">${esc$1(c.name)}</span>`);
		}).join("")}
          ${crumbs.length === 0 ? `<span style="color:#94a3b8;margin-left:auto;font-family:monospace;">${esc$1(rootCwd)}</span>` : ""}
        </div>
        <div>
          ${loadingDir ? fileLoadingSpinnerHtml(activeSubDir ? `正在读取 ${activeSubDir} …` : "正在读取目录…") : entries.map((e) => `
            <div class="file-row" onclick="clickRealFileEntry('${hostId}', '${sessionId}', '${esc$1(rootCwd)}', '${esc$1(e.relPath)}', ${Boolean(e.isDirectory)}, true)">
              <div class="file-row-left">
                <span style="font-size:18px;">${fileEntryIcon(e)}</span>
                <span style="font-weight:500;">${esc$1(e.name)}</span>
              </div>
              <span style="font-size:12px;color:#94a3b8;">${e.isDirectory ? "目录" : formatBytes(e.size)} ›</span>
            </div>
          `).join("") || `<div style="padding:36px;text-align:center;color:#94a3b8;">正在同步目录文件列表...</div>`}
        </div>
      `;
		body.scrollTop = prevScrollTop;
	}
	function backFromDrawerPreview() {
		const found = findSessionGlobal(activeSessionId);
		if (found?.host) {
			delete pinnedDrawerPreviewByHost[found.host.hostId];
			if (found.host.lastFilePreview) found.host.lastFilePreview._showInDrawer = false;
		}
		renderInChatFileDrawerBody();
	}
	function quoteFileIntoChat(relPath) {
		closeMobileFile();
		const input = document.getElementById("globalPromptInput");
		input.value = `请查看文件 @${relPath} 并帮我分析：${input.value}`;
		input.focus();
		onComposerInput();
		showToast(`📎 已插入 @${relPath}`);
	}
	function sleepMs(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	function reconcileFileLoading(host) {
		if (!host) return;
		if (fileLoading && fileLoading.hostId === host.hostId) {
			const listing = host.lastFsListing;
			if (listing && (listing.rootCwd || "") === fileLoading.cwd && (listing.subDir || "") === (fileLoading.subDir || "") && listing.at !== fileLoading.prevAt) fileLoading = null;
			else if (Date.now() - fileLoading.at > 15e3) fileLoading = null;
		}
		if (filePreviewLoading && filePreviewLoading.hostId === host.hostId) {
			const box = host.lastFilePreview;
			const expectedBase = String(filePreviewLoading.relPath || "").split("/").filter(Boolean).pop() || "";
			if (box && box.at !== filePreviewLoading.prevAt && (box.relPath === filePreviewLoading.relPath || expectedBase && box.name === expectedBase)) {
				box._showInDrawer = Boolean(filePreviewLoading.drawer);
				box._showInMain = !filePreviewLoading.drawer;
				if (filePreviewLoading.drawer) pinnedDrawerPreviewByHost[host.hostId] = box;
				else pinnedMainPreviewByHost[host.hostId] = box;
				filePreviewLoading = null;
			} else if (Date.now() - filePreviewLoading.at > 15e3) filePreviewLoading = null;
		}
	}
	function fileEntryIcon(entry) {
		if (entry?.isDirectory) return "📁";
		const name = String(entry?.name || entry?.relPath || "").toLowerCase();
		if (/\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/.test(name)) return "🎬";
		if (/\.(png|jpe?g|webp|gif|svg|bmp|ico|avif|heic|heif)$/.test(name)) return "🖼️";
		if (/\.(html?|xhtml)$/.test(name)) return "🌐";
		if (/\.(md|markdown|mdx)$/.test(name)) return "📋";
		return "📄";
	}
	function describeVideoPreviewStatus(preview) {
		const strategy = preview?.videoProbe?.strategy || "";
		const canHls = preview?.hlsAvailable !== false && !preview?._transcodeVideo;
		if (preview?._rawVideo) return {
			badge: canHls ? "无损原画 HLS 切片流" : "原始视频字节直出流",
			toggleLabel: "✨ 切回自适应秒播流"
		};
		if (preview?._transcodeVideo) return {
			badge: "智能 H.264 兼容流 · 拖动秒播",
			toggleLabel: "🎞️ 切换无损原画流"
		};
		if (canHls) return {
			badge: "⚡ HLS 切片秒播 · 抗弱网零卡死",
			toggleLabel: "🎞️ 切换无损原画流"
		};
		if (strategy === "remux") return {
			badge: "无损快启重封装 · 拖动秒播",
			toggleLabel: "🔄 强制重编码兼容流"
		};
		return {
			badge: "支持拖动进度条分片秒播",
			toggleLabel: "🔄 播不出？转码兼容播放"
		};
	}
	function buildTranscodeFallbackSrc(rawSrc) {
		if (!rawSrc || !rawSrc.includes("/fs/stream")) return "";
		try {
			const u = new URL(rawSrc, typeof location !== "undefined" ? location.origin : "http://localhost");
			u.searchParams.delete("raw");
			u.searchParams.delete("preview");
			u.searchParams.set("transcode", "1");
			const freshMt = hubState.mediaTicket || "";
			if (freshMt) u.searchParams.set("mt", freshMt);
			return `${u.pathname}?${u.searchParams.toString()}`;
		} catch {
			return "";
		}
	}
	function buildRetryFreshVideoSrc(rawSrc) {
		if (!rawSrc || !rawSrc.includes("/fs/stream")) return "";
		try {
			const u = new URL(rawSrc, typeof location !== "undefined" ? location.origin : "http://localhost");
			const freshMt = hubState.mediaTicket || "";
			if (freshMt) u.searchParams.set("mt", freshMt);
			u.searchParams.set("_r", String(Date.now()));
			return `${u.pathname}?${u.searchParams.toString()}`;
		} catch {
			return "";
		}
	}
	const p2pVideoBlobCache = /* @__PURE__ */ new Map();
	function clearSmartVideoErrorBanner(videoEl) {
		if (!videoEl) return;
		if (videoEl.dataset) delete videoEl.dataset.dshErrorBannerShown;
		const parent = videoEl.parentElement;
		if (!parent) return;
		parent.querySelectorAll("[data-dsh-error-tip], [data-dsh-fallback-dl]").forEach((el) => {
			try {
				el.remove();
			} catch {}
		});
	}
	async function mountSmartVideoElement(videoEl) {
		if (!videoEl || videoEl.dataset?.dshMounted === "1") return;
		videoEl.dataset.dshMounted = "1";
		const hlsSrc = videoEl.dataset?.hlsSrc || "";
		const fallbackSrc = videoEl.dataset?.fallbackSrc || videoEl.getAttribute("src") || "";
		const videoBytes = Number(videoEl.dataset?.videoBytes || 0);
		await attachSmartHlsPlayer(videoEl, {
			hlsUrl: hlsSrc,
			fallbackSrc
		});
		if (videoBytes > 0 && videoBytes <= 25165824 && fallbackSrc) maybeAccelerateVideoViaP2p(videoEl);
	}
	async function maybeAccelerateVideoViaP2p(videoEl, { fromErrorFallback = false } = {}) {
		if (!videoEl) return false;
		if (videoEl.dataset?.dshP2pUpgraded === "1") return true;
		if (videoEl.__dshP2pPromise) return videoEl.__dshP2pPromise;
		const rawSrc = videoEl.dataset?.fallbackSrc || videoEl.getAttribute("src") || videoEl.currentSrc || "";
		if (!rawSrc || rawSrc.startsWith("blob:") || !rawSrc.includes("/fs/stream")) return false;
		const cacheKey = rawSrc.replace(/([?&])_r=[^&]+/g, "").replace(/[?&]$/, "");
		const cachedBlobUrl = p2pVideoBlobCache.get(cacheKey);
		if (cachedBlobUrl) {
			swapVideoElementToBlobUrl(videoEl, cachedBlobUrl);
			return true;
		}
		videoEl.dataset.dshP2pInflight = "1";
		const runPromise = (async () => {
			try {
				const p2pRes = await fetchMediaViaWebRtc(rawSrc, {
					token: getToken(),
					mediaTicket: hubState.mediaTicket || "",
					maxBytes: 25165824,
					connectTimeoutMs: fromErrorFallback ? 1800 : 1200
				});
				if (!p2pRes?.ok || !p2pRes.blob || !videoEl.isConnected) return false;
				const blobUrl = URL.createObjectURL(p2pRes.blob);
				p2pVideoBlobCache.set(cacheKey, blobUrl);
				while (p2pVideoBlobCache.size > 12) {
					const oldestKey = p2pVideoBlobCache.keys().next().value;
					const oldUrl = p2pVideoBlobCache.get(oldestKey);
					p2pVideoBlobCache.delete(oldestKey);
					if (oldUrl) try {
						URL.revokeObjectURL(oldUrl);
					} catch {}
				}
				swapVideoElementToBlobUrl(videoEl, blobUrl);
				return true;
			} catch {
				return false;
			} finally {
				delete videoEl.__dshP2pPromise;
				if (videoEl.dataset) delete videoEl.dataset.dshP2pInflight;
			}
		})();
		videoEl.__dshP2pPromise = runPromise;
		return runPromise;
	}
	function swapVideoElementToBlobUrl(videoEl, blobUrl) {
		if (!videoEl || !blobUrl) return;
		const wasPaused = videoEl.paused;
		const savedTime = Number(videoEl.currentTime) || 0;
		const savedRate = Number(videoEl.playbackRate) || 1;
		destroyHlsPlayer(videoEl);
		delete videoEl.dataset.dshHlsActive;
		clearSmartVideoErrorBanner(videoEl);
		videoEl.dataset.dshP2pUpgraded = "1";
		videoEl.src = blobUrl;
		const restoreState = () => {
			try {
				if (savedTime > .1 && Number.isFinite(videoEl.duration) && savedTime < videoEl.duration) videoEl.currentTime = savedTime;
				if (savedRate !== 1) videoEl.playbackRate = savedRate;
				if (!wasPaused) videoEl.play()?.catch?.(() => {});
			} catch {}
		};
		videoEl.addEventListener("loadedmetadata", restoreState, { once: true });
		const statusEl = videoEl.parentElement?.querySelector?.("[data-dsh-video-status=\"1\"]");
		if (statusEl && statusEl.textContent) {
			statusEl.textContent = `${statusEl.textContent.split("·")[0].trim()} · ⚡ P2P 极速直连 · 零缓冲秒播`;
			if (langPref === "en") applyLangToDom(videoEl.parentElement, langPref);
		}
	}
	function onSmartVideoLoadedMeta(videoEl) {
		if (!videoEl) return;
		if (videoEl.videoWidth > 0) clearSmartVideoErrorBanner(videoEl);
		if (videoEl.dataset?.dshFallbackTried === "1") return;
		if (videoEl.videoWidth === 0 && Number(videoEl.duration) > 0) {
			const nextSrc = buildTranscodeFallbackSrc(videoEl.getAttribute("src") || videoEl.currentSrc || "");
			if (!nextSrc) return;
			videoEl.dataset.dshFallbackTried = "1";
			showToast("🔄 检测到特殊视频编码，已自动切换电脑端 H.264 兼容流…");
			videoEl.src = nextSrc;
			try {
				videoEl.load();
			} catch {}
		}
	}
	async function onSmartVideoError(videoEl) {
		if (!videoEl) return;
		if (videoEl.error?.code === 1) return;
		if (videoEl.__dshHlsInstance) return;
		const currentSrc = videoEl.getAttribute("src") || videoEl.currentSrc || "";
		if (!currentSrc || currentSrc.startsWith("blob:") || videoEl.dataset?.dshP2pUpgraded === "1") return;
		if (currentSrc.includes("/fs/hls/") && videoEl.dataset?.fallbackSrc && videoEl.dataset?.dshHlsFailed !== "1") {
			destroyHlsPlayer(videoEl);
			delete videoEl.dataset.dshHlsActive;
			videoEl.dataset.dshHlsFailed = "1";
			videoEl.src = videoEl.dataset.fallbackSrc;
			try {
				videoEl.load();
			} catch {}
			return;
		}
		if (videoEl.dataset?.dshP2pFallbackTried !== "1" || videoEl.__dshP2pPromise) {
			videoEl.dataset.dshP2pFallbackTried = "1";
			if (await maybeAccelerateVideoViaP2p(videoEl, { fromErrorFallback: true }) || videoEl.dataset?.dshP2pUpgraded === "1") return;
		}
		const alreadyCompatOrDirect = videoEl.dataset?.dshUniversalDirect === "1" || currentSrc.includes("preview=1") || currentSrc.includes("transcode=1");
		if (alreadyCompatOrDirect && videoEl.dataset?.dshNetRetryTried !== "1") {
			const retrySrc = buildRetryFreshVideoSrc(currentSrc);
			if (retrySrc) {
				videoEl.dataset.dshNetRetryTried = "1";
				videoEl.src = retrySrc;
				try {
					videoEl.load();
				} catch {}
				return;
			}
		}
		if (!alreadyCompatOrDirect && videoEl.dataset?.dshFallbackTried !== "1") {
			const nextSrc = buildTranscodeFallbackSrc(currentSrc);
			if (nextSrc && nextSrc !== currentSrc) {
				videoEl.dataset.dshFallbackTried = "1";
				showToast("🔄 正在自动切换兼容转码流重试播放…");
				videoEl.src = nextSrc;
				try {
					videoEl.load();
				} catch {}
				return;
			}
		}
		if (videoEl.dataset?.dshP2pUpgraded === "1" || videoEl.dataset?.dshErrorBannerShown === "1") return;
		videoEl.dataset.dshErrorBannerShown = "1";
		const parent = videoEl.parentElement;
		if (!parent) return;
		let dlHref = "";
		let dlName = "video.mp4";
		try {
			const u = new URL(currentSrc, typeof location !== "undefined" ? location.origin : "http://localhost");
			if (u.pathname.includes("/fs/stream")) {
				const base = (u.searchParams.get("path") || "").split("/").filter(Boolean).pop();
				if (base) dlName = base;
				u.searchParams.delete("transcode");
				u.searchParams.delete("preview");
				u.searchParams.delete("raw");
				u.searchParams.delete("_r");
				u.searchParams.set("download", "1");
				const freshMt = hubState.mediaTicket || "";
				if (freshMt) u.searchParams.set("mt", freshMt);
				dlHref = `${u.pathname}?${u.searchParams.toString()}`;
			}
		} catch {}
		const tip = document.createElement("div");
		tip.dataset.dshErrorTip = "1";
		tip.style.cssText = "font-size:12px;color:#fca5a5;text-align:center;padding:6px 10px;line-height:1.5;";
		tip.textContent = "⚠️ 当前网络波动未能完成在线加载，可点下方高速分片下载到本地观看";
		parent.appendChild(tip);
		if (dlHref && !parent.querySelector("[data-dsh-fallback-dl]")) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "media-toolbar-pill";
			btn.dataset.dshFallbackDl = "1";
			btn.textContent = "⬇️ 保存原视频到本地播放";
			btn.onclick = (ev) => {
				ev.stopPropagation();
				downloadPreviewMedia(dlHref, dlName, btn);
			};
			parent.appendChild(btn);
		}
	}
	function toggleOriginalPreviewImage(hostId, inDrawer = false) {
		const target = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		const preview = target || host?.lastFilePreview;
		if (!preview) return;
		preview._origImage = !preview._origImage;
		showToast(preview._origImage ? "🔍 已切换为无损原图模式" : "⚡ 已切换为智能省流高清模式");
		renderAll();
		renderFilePanes();
	}
	function switchVideoTranscodeMode(hostId, inDrawer = false) {
		const target = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		const preview = target || host?.lastFilePreview;
		if (!preview) return;
		if (preview?.hlsAvailable !== false) {
			preview._rawVideo = !preview._rawVideo;
			preview._transcodeVideo = false;
			showToast(preview._rawVideo ? "🎞️ 已切换为无损原画 HLS 切片流" : "⚡ 已切回自适应抗弱网 HLS 秒播流");
		} else {
			preview._rawVideo = false;
			preview._transcodeVideo = !preview._transcodeVideo;
			showToast(preview._transcodeVideo ? "🔄 正在用电脑端 H.264 兼容转码流加载…" : "✨ 已切回智能秒播模式");
		}
		renderAll();
		renderFilePanes();
	}
	async function requestDirList(hostId, agentId, cwd, subDir, inDrawer = false) {
		fileProjectCwd = cwd;
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		if (inDrawer) delete pinnedDrawerPreviewByHost[hostId];
		else delete pinnedMainPreviewByHost[hostId];
		if (host?.lastFilePreview) {
			if (inDrawer) host.lastFilePreview._showInDrawer = false;
			else host.lastFilePreview._showInMain = false;
		}
		fileLoading = {
			hostId,
			cwd,
			subDir: subDir || "",
			prevAt: host?.lastFsListing?.at || 0,
			at: Date.now(),
			drawer: inDrawer
		};
		renderAll();
		try {
			const qp = new URLSearchParams({
				cwd: String(cwd || ""),
				path: String(subDir || ""),
				agentId: String(agentId || "")
			});
			const fastRes = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/fs/list?${qp.toString()}`);
			const fastData = await fastRes.json().catch(() => null);
			if (fastRes.ok && fastData?.ok) {
				if (host) host.lastFsListing = {
					at: Date.now(),
					agentId: agentId || "",
					rootCwd: fastData.rootCwd || cwd || "",
					subDir: fastData.subDir ?? (subDir || ""),
					entries: fastData.entries || []
				};
				fileLoading = null;
				renderAll();
				renderFilePanes();
				return;
			}
			if (fastRes.status !== 404 && fastData?.error) {
				fileLoading = null;
				showToast("❌ 读取目录失败：" + fastData.error);
				renderAll();
				return;
			}
		} catch {}
		let failure = "";
		try {
			const out = await dispatchHostCommand(hostId, {
				type: "list_files",
				agentId,
				cwd,
				subDir
			});
			if (out && out.ok === false) failure = out.error || "电脑未接受该指令";
		} catch (err) {
			failure = err && err.message || String(err);
		}
		if (failure) {
			fileLoading = null;
			showToast("❌ 读取目录失败：" + failure);
			renderAll();
			return;
		}
		for (let i = 0; i < 22 && fileLoading; i++) {
			await sleepMs(180);
			if (!fileLoading) break;
			if (!(await fetchState()).ok) break;
		}
		if (fileLoading) {
			fileLoading = null;
			showToast("⚠️ 读取目录超时：电脑可能离线，请重新点一下目录");
		}
		renderAll();
		renderFilePanes();
	}
	async function clickRealFileEntry(hostId, agentId, cwd, relPath, isDir, inDrawer = false) {
		if (isDir) {
			await requestDirList(hostId, agentId, cwd, relPath, inDrawer);
			return;
		}
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		filePreviewLoading = {
			hostId,
			relPath,
			prevAt: host?.lastFilePreview?.at || 0,
			at: Date.now(),
			drawer: inDrawer
		};
		renderAll();
		try {
			const qp = new URLSearchParams({
				cwd: String(cwd || ""),
				path: String(relPath || ""),
				agentId: String(agentId || "")
			});
			const fastRes = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/fs/read?${qp.toString()}`);
			const fastData = await fastRes.json().catch(() => null);
			if (fastRes.ok && fastData?.ok) {
				const streamQuery = new URLSearchParams({
					path: String(fastData.relPath || relPath || ""),
					...cwd ? { cwd: String(cwd) } : {},
					...agentId ? { agentId: String(agentId) } : {}
				}).toString();
				const box = {
					...fastData,
					at: Date.now(),
					agentId: agentId || "",
					relPath: fastData.relPath || relPath,
					streamUrl: fastData.streamUrl || `/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${streamQuery}`,
					_showInDrawer: Boolean(inDrawer),
					_showInMain: !inDrawer
				};
				if (host) host.lastFilePreview = box;
				if (inDrawer) pinnedDrawerPreviewByHost[hostId] = box;
				else pinnedMainPreviewByHost[hostId] = box;
				filePreviewLoading = null;
				renderAll();
				renderFilePanes();
				return;
			}
			if (fastRes.status !== 404 && fastData?.error) {
				filePreviewLoading = null;
				showToast("❌ 读取文件失败：" + fastData.error);
				renderAll();
				return;
			}
		} catch {}
		let failure = "";
		try {
			const out = await dispatchHostCommand(hostId, {
				type: "read_file",
				agentId,
				cwd,
				relPath
			});
			if (out && out.ok === false) failure = out.error || "电脑未接受该指令";
		} catch (err) {
			failure = err && err.message || String(err);
		}
		if (failure) {
			filePreviewLoading = null;
			showToast("❌ 读取文件失败：" + failure);
			renderAll();
			return;
		}
		for (let i = 0; i < 22 && filePreviewLoading; i++) {
			await sleepMs(180);
			if (!filePreviewLoading) break;
			if (!(await fetchState()).ok) break;
		}
		if (filePreviewLoading) {
			filePreviewLoading = null;
			showToast("⚠️ 读取文件超时：电脑可能离线，请重新点一下文件");
		}
		renderAll();
		renderFilePanes();
	}
	function renderFilePanes() {
		if (desktopStageMode !== "code") return;
		const pane = document.getElementById("desktopStageCodePane");
		if (!pane || pane.style.display === "none") return;
		renderFilesTab(pane);
	}
	function toggleMdPreviewMode() {
		window.__dshRawMdPreview = !window.__dshRawMdPreview;
		renderAll();
		renderFilePanes();
	}
	function toggleHtmlPreviewMode() {
		window.__dshRawHtmlPreview = !window.__dshRawHtmlPreview;
		renderAll();
		renderFilePanes();
	}
	let activeHtmlOverlay = null;
	function rawCloseFullscreenHtmlPreview() {
		activeHtmlOverlay = null;
		const overlay = document.getElementById("htmlPreviewOverlay");
		const body = document.getElementById("htmlPreviewOverlayBody");
		if (body) body.innerHTML = "";
		if (overlay) overlay.style.display = "none";
	}
	function renderFullscreenHtmlOverlay() {
		const overlay = document.getElementById("htmlPreviewOverlay");
		const body = document.getElementById("htmlPreviewOverlayBody");
		const titleEl = document.getElementById("htmlPreviewOverlayTitle");
		const modeBtn = document.getElementById("htmlPreviewModeBtn");
		if (!overlay || !body || !activeHtmlOverlay) return;
		if (titleEl) titleEl.textContent = `🌐 ${activeHtmlOverlay.title || "HTML 交互预览"}`;
		if (modeBtn) modeBtn.textContent = activeHtmlOverlay.showSource ? "🌐 预览" : "</> 源码";
		if (activeHtmlOverlay.showSource) {
			const numbered = String(activeHtmlOverlay.rawHtml || "").split("\n").map((line, idx) => `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:32px;text-align:right;flex-shrink:0;">${idx + 1}</span><span style="white-space:pre;">${esc$1(line)}</span></div>`).join("");
			body.style.background = "#0f172a";
			body.innerHTML = `<div style="padding:14px 12px;color:#f8fafc;min-height:100%;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;">${numbered}</div>`;
		} else {
			const srcdocAttr = escapeSrcdocAttr(buildSandboxedHtmlSrcdoc(activeHtmlOverlay.rawHtml || "", {
				hostId: activeHtmlOverlay.hostId || "",
				relPath: activeHtmlOverlay.relPath || "",
				cwd: activeHtmlOverlay.cwd || "",
				agentId: activeHtmlOverlay.agentId || "",
				mediaTicket: hubState.mediaTicket || "",
				origin: typeof location !== "undefined" ? location.origin : ""
			}));
			body.style.background = "#ffffff";
			body.innerHTML = `<iframe title="${esc$1(activeHtmlOverlay.title || "HTML Preview")}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer" srcdoc="${srcdocAttr}" style="width:100%;height:100%;min-height:100%;border:none;background:#ffffff;display:block;"></iframe>`;
		}
		overlay.style.display = "flex";
		applyLangToDom(overlay, langPref);
	}
	function openFullscreenHtmlOverlay(opts) {
		activeHtmlOverlay = {
			title: opts?.title || "HTML 交互预览",
			rawHtml: String(opts?.rawHtml || ""),
			hostId: opts?.hostId || "",
			relPath: opts?.relPath || "",
			cwd: opts?.cwd || "",
			agentId: opts?.agentId || "",
			showSource: false
		};
		renderFullscreenHtmlOverlay();
		trackOverlay("htmlPreviewOverlay", rawCloseFullscreenHtmlPreview);
	}
	function openInlineHtmlPreview(btnEl) {
		const preEl = btnEl?.closest?.(".code-card")?.querySelector?.("pre");
		const rawHtml = preEl ? preEl.textContent || "" : "";
		if (!rawHtml.trim()) {
			showToast("⚠️ 未提取到 HTML 代码内容");
			return;
		}
		const found = findSessionGlobal(activeSessionId);
		openFullscreenHtmlOverlay({
			title: "对话内 HTML 交互预览",
			rawHtml,
			hostId: found?.host?.hostId || "",
			relPath: "inline.html",
			cwd: found?.session?.cwd || fileProjectCwd || "",
			agentId: found?.session?.id || ""
		});
	}
	async function openFullscreenHtmlFromPreview(hostId, inDrawer = false) {
		const target = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		const preview = target || host?.lastFilePreview;
		if (!preview) return;
		await ensureHtmlPreviewFullLoaded(hostId, preview);
		const found = findSessionGlobal(activeSessionId);
		openFullscreenHtmlOverlay({
			title: preview.name || preview.relPath || "HTML 交互预览",
			rawHtml: preview.content || "",
			hostId,
			relPath: preview.relPath || preview.name || "",
			cwd: fileProjectCwd || found?.session?.cwd || "",
			agentId: preview.agentId || found?.session?.id || ""
		});
	}
	function closeFullscreenHtmlPreview() {
		dismissOverlay("htmlPreviewOverlay", rawCloseFullscreenHtmlPreview);
	}
	function toggleFullscreenHtmlSource() {
		if (!activeHtmlOverlay) return;
		activeHtmlOverlay.showSource = !activeHtmlOverlay.showSource;
		renderFullscreenHtmlOverlay();
	}
	function reloadFullscreenHtmlPreview() {
		if (!activeHtmlOverlay) return;
		activeHtmlOverlay.showSource = false;
		renderFullscreenHtmlOverlay();
		showToast("🔄 已重新加载 HTML 页面");
	}
	async function downloadPreviewMedia(dlUrl, fileName = "download", btnEl = null) {
		if (!dlUrl) return;
		const safeName = String(fileName || "download").split("/").filter(Boolean).pop() || "download";
		if (btnEl?.__readyShareFile && typeof navigator !== "undefined" && typeof navigator.share === "function") {
			const cachedFile = btnEl.__readyShareFile;
			try {
				await navigator.share({
					files: [cachedFile],
					title: safeName
				});
				delete btnEl.__readyShareFile;
				if (btnEl.__origLabel) btnEl.textContent = btnEl.__origLabel;
				return;
			} catch (err) {
				if (err?.name === "AbortError") return;
			}
		}
		if (btnEl?.dataset?.downloading === "1") return;
		const origLabel = btnEl ? btnEl.__origLabel || btnEl.textContent || "" : "";
		if (btnEl) {
			btnEl.__origLabel = origLabel;
			btnEl.dataset.downloading = "1";
			btnEl.disabled = true;
			btnEl.textContent = "⏳ 准备中…";
		}
		let wakeLockSentinel = null;
		try {
			if (typeof navigator !== "undefined" && navigator.wakeLock?.request) wakeLockSentinel = await navigator.wakeLock.request("screen").catch(() => null);
		} catch {}
		try {
			const token = getToken();
			const freshMt = hubState.mediaTicket || "";
			let effectiveDlUrl = String(dlUrl || "");
			const isDataUrl = effectiveDlUrl.startsWith("data:");
			if (!isDataUrl && freshMt && effectiveDlUrl.includes("/fs/stream")) try {
				const u = new URL(effectiveDlUrl, typeof location !== "undefined" ? location.origin : "http://localhost");
				u.searchParams.set("mt", freshMt);
				effectiveDlUrl = `${u.pathname}?${u.searchParams.toString()}`;
			} catch {}
			const guessMimeByName = (nameStr) => /\.png$/i.test(nameStr) ? "image/png" : /\.(jpe?g)$/i.test(nameStr) ? "image/jpeg" : /\.webp$/i.test(nameStr) ? "image/webp" : /\.gif$/i.test(nameStr) ? "image/gif" : /\.svg$/i.test(nameStr) ? "image/svg+xml" : /\.mp4$/i.test(nameStr) ? "video/mp4" : /\.mov$/i.test(nameStr) ? "video/quicktime" : /\.webm$/i.test(nameStr) ? "video/webm" : "application/octet-stream";
			let blob = null;
			let mimeType = guessMimeByName(safeName);
			const streamDesc = !isDataUrl ? parseStreamUrlDescriptor(effectiveDlUrl) : null;
			if (streamDesc) {
				const p2pOut = await fetchMediaViaWebRtc(effectiveDlUrl, {
					token,
					mediaTicket: freshMt || streamDesc.mt,
					download: true,
					fastPreview: false,
					raw: true,
					transcode: false,
					connectTimeoutMs: 1500,
					onProgress: ({ received, totalBytes }) => {
						if (!btnEl) return;
						if (totalBytes > 0) btnEl.textContent = `⚡ 直连拉取 ${Math.min(99, Math.round(received / totalBytes * 100))}%…`;
						else if (received > 0) btnEl.textContent = `⚡ 已直连拉取 ${formatBytes(received)}…`;
					}
				});
				if (p2pOut?.ok && p2pOut.blob) {
					blob = p2pOut.blob;
					mimeType = (p2pOut.mime || "").split(";")[0].trim() || mimeType;
				}
			}
			if (!blob) {
				const baseAuthHeaders = token ? { authorization: `Bearer ${token}` } : {};
				const DOWNLOAD_SLICE_BYTES = 2097152;
				const parseContentRangeInfo = (headerVal) => {
					const m = /bytes\s+(\d+)-(\d+)\/(\d+)/i.exec(String(headerVal || "").trim());
					if (!m) return null;
					return {
						start: Number(m[1]),
						end: Number(m[2]),
						total: Number(m[3])
					};
				};
				const updateBtnProgress = (received, totalBytes) => {
					if (!btnEl) return;
					if (totalBytes > 0) btnEl.textContent = `⏳ 拉取中 ${Math.min(99, Math.round(received / totalBytes * 100))}%…`;
					else btnEl.textContent = `⏳ 已拉取 ${formatBytes(received)}…`;
				};
				const fetchSliceBytesWithRetry = async (extraHeaders = {}, onDelta = null) => {
					let lastErr = null;
					for (let attempt = 0; attempt < 3; attempt += 1) {
						let attemptAdded = 0;
						try {
							const resp = isDataUrl ? await fetch(effectiveDlUrl) : await fetch(effectiveDlUrl, { headers: {
								...baseAuthHeaders,
								...extraHeaders
							} });
							if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
							const chunks = [];
							if (resp.body && typeof resp.body.getReader === "function") {
								const reader = resp.body.getReader();
								while (true) {
									const { done, value } = await reader.read();
									if (done) break;
									if (value) {
										chunks.push(value);
										attemptAdded += value.byteLength;
										onDelta?.(value.byteLength);
									}
								}
							} else {
								const u8 = new Uint8Array(await resp.arrayBuffer());
								chunks.push(u8);
								attemptAdded += u8.byteLength;
								onDelta?.(u8.byteLength);
							}
							return {
								resp,
								chunks
							};
						} catch (err) {
							if (attemptAdded > 0) onDelta?.(-attemptAdded);
							lastErr = err;
							if (attempt < 2) await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
						}
					}
					throw lastErr || /* @__PURE__ */ new Error("分片拉取失败");
				};
				let receivedBytes = 0;
				let knownTotalBytes = 0;
				const firstSlice = await fetchSliceBytesWithRetry(!isDataUrl && streamDesc ? { Range: `bytes=0-2097151` } : {}, (delta) => {
					receivedBytes = Math.max(0, receivedBytes + delta);
					updateBtnProgress(receivedBytes, knownTotalBytes);
				});
				const firstResp = firstSlice.resp;
				const firstCr = firstResp.status === 206 ? parseContentRangeInfo(firstResp.headers.get("content-range")) : null;
				knownTotalBytes = firstCr?.total || Number(firstResp.headers.get("content-length") || 0);
				mimeType = (firstResp.headers.get("content-type") || "").split(";")[0].trim() || mimeType;
				updateBtnProgress(receivedBytes, knownTotalBytes);
				if (firstCr && firstCr.end + 1 < firstCr.total) {
					const ranges = [];
					for (let s = firstCr.end + 1; s < firstCr.total; s += DOWNLOAD_SLICE_BYTES) {
						const e = Math.min(firstCr.total - 1, s + DOWNLOAD_SLICE_BYTES - 1);
						ranges.push({
							start: s,
							end: e
						});
					}
					const orderedPartChunks = new Array(ranges.length + 1);
					orderedPartChunks[0] = firstSlice.chunks;
					let nextIdx = 0;
					const workerCount = Math.min(3, ranges.length);
					const workers = Array.from({ length: workerCount }, async () => {
						while (nextIdx < ranges.length) {
							const myIdx = nextIdx++;
							const { start, end } = ranges[myIdx];
							const partOut = await fetchSliceBytesWithRetry({ Range: `bytes=${start}-${end}` }, (delta) => {
								receivedBytes = Math.max(0, receivedBytes + delta);
								updateBtnProgress(receivedBytes, knownTotalBytes);
							});
							orderedPartChunks[myIdx + 1] = partOut.chunks;
						}
					});
					await Promise.all(workers);
					const flatChunks = [];
					for (const group of orderedPartChunks) if (Array.isArray(group)) flatChunks.push(...group);
					blob = new Blob(flatChunks, { type: mimeType });
				} else blob = new Blob(firstSlice.chunks, { type: mimeType });
			}
			const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
			if ((isIosDevice() || isStandaloneApp() || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)) && typeof File === "function" && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function") {
				const shareFile = new File([blob], safeName, { type: mimeType });
				if (navigator.canShare({ files: [shareFile] })) try {
					await navigator.share({
						files: [shareFile],
						title: safeName
					});
					if (btnEl) {
						btnEl.dataset.downloading = "0";
						btnEl.disabled = false;
						btnEl.textContent = origLabel;
					}
					return;
				} catch (shareErr) {
					if (shareErr?.name === "AbortError") {
						if (btnEl) {
							btnEl.dataset.downloading = "0";
							btnEl.disabled = false;
							btnEl.textContent = origLabel;
						}
						return;
					}
					if (shareErr?.name === "NotAllowedError" && btnEl) {
						btnEl.__readyShareFile = shareFile;
						btnEl.dataset.downloading = "0";
						btnEl.disabled = false;
						btnEl.textContent = "📲 已缓存 · 再点存入相册/文件";
						showToast("📲 文件已拉取完成，再点一次按钮即可存入相册或文件");
						return;
					}
				}
			}
			if (/MicroMessenger/i.test(ua)) showToast("💡 微信内置浏览器限制直接存盘，可点右上角 ⋯ 在系统浏览器打开保存");
			else {
				const blobUrl = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = blobUrl;
				anchor.download = safeName;
				anchor.rel = "noopener";
				anchor.style.display = "none";
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				setTimeout(() => URL.revokeObjectURL(blobUrl), 6e4);
				showToast(`✅ 已开始保存 ${safeName}`);
			}
		} catch (err) {
			showToast("❌ 保存失败：" + (err && err.message || String(err)));
		} finally {
			if (wakeLockSentinel) try {
				await wakeLockSentinel.release();
			} catch {}
			if (btnEl && !btnEl.__readyShareFile) {
				btnEl.dataset.downloading = "0";
				btnEl.disabled = false;
				btnEl.textContent = origLabel;
			}
		}
	}
	function cancelFilePreviewLoading() {
		filePreviewLoading = null;
		renderAll();
	}
	function renderFilesTab(container = document.getElementById("mainViewport")) {
		const hosts = hubState.hosts || [];
		const host = currentHostId === "ALL_HOSTS" ? hosts[0] : hosts.find((h) => h.hostId === currentHostId);
		if (!host) {
			container.innerHTML = `
          <div style="padding:48px 20px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">💻</div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">还没有接入电脑</div>
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">请先在电脑终端执行一行安装命令接入本机，即可远程浏览项目代码与文件</div>
            <button class="pill-action-btn primary" onclick="switchTab('chats')">👉 去查看一行接入命令</button>
          </div>
        `;
			return;
		}
		reconcileFileLoading(host);
		const projects = getHostProjects(host);
		if (!fileProjectCwd && projects[0]) fileProjectCwd = projects[0].cwd;
		const firstSession = (host.bridgeState?.tasks || []).find((t) => t.cwd === fileProjectCwd) || (host.bridgeState?.tasks || [])[0];
		const agentId = firstSession?.id || "";
		const preview = pinnedMainPreviewByHost[host.hostId] || (host.lastFilePreview?._showInMain ? host.lastFilePreview : null);
		if (filePreviewLoading && filePreviewLoading.hostId === host.hostId && !filePreviewLoading.drawer) {
			container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="cancelFilePreviewLoading()">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);">${esc$1(String(filePreviewLoading.relPath || "").split("/").filter(Boolean).pop() || "文件")}</span>
            <span style="width:72px;"></span>
          </div>
          <div style="padding:16px 12px;background:#0f172a;min-height:calc(100% - 44px);">
            ${fileLoadingSpinnerHtml("正在读取文件内容…")}
          </div>
        `;
			return;
		}
		if (preview && preview._showInMain) {
			container.dataset.dshFilesListKey = "";
			ensureTextPreviewLoaded(host.hostId, preview);
			if (isHtmlFileName(preview.name || preview.relPath || "")) ensureHtmlPreviewFullLoaded(host.hostId, preview);
			const kind = previewKind(preview);
			const mt = hubState.mediaTicket || "";
			const isMarkdown = kind === "text" && /\.(md|markdown|mdx)$/i.test(preview.name || preview.relPath || "");
			const isHtml = kind === "text" && isHtmlFileName(preview.name || preview.relPath || "");
			const rawMdMode = Boolean(window.__dshRawMdPreview);
			const rawHtmlMode = Boolean(window.__dshRawHtmlPreview);
			const previewKey = `${preview.at || 0}:${preview.relPath || ""}:${kind}:${preview._origImage ? 1 : 0}:${preview._transcodeVideo ? 1 : 0}:${preview._rawVideo ? 1 : 0}:${isMarkdown ? rawMdMode ? "raw" : "md" : ""}:${isHtml ? rawHtmlMode ? "raw-html" : "html" : ""}:${(preview.content || "").length}`;
			if (container.dataset.dshPreviewKey === previewKey && container.querySelector(".file-preview-body")) return;
			container.dataset.dshPreviewKey = previewKey;
			const numberedHtml = String(preview.content || "").split("\n").map((line, i) => `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc$1(line)}</span></div>`).join("");
			const canToggleOrigImg = kind === "image" && Boolean(preview.streamUrl) && !/\.(svg|gif)$/i.test(preview.name || "") && (!preview.size || preview.size > 307200);
			const dlUrl = preview.streamUrl ? appendMediaAuth(`${preview.streamUrl}${preview.streamUrl.includes("?") ? "&" : "?"}download=1`, mt) : "";
			const videoMetaUi = kind === "video" ? describeVideoPreviewStatus(preview) : null;
			const htmlSrcdocAttr = isHtml && !rawHtmlMode ? escapeSrcdocAttr(buildSandboxedHtmlSrcdoc(preview.content || "", {
				hostId: host.hostId,
				relPath: preview.relPath || preview.name || "",
				cwd: fileProjectCwd || firstSession?.cwd || "",
				agentId: preview.agentId || agentId || "",
				mediaTicket: mt,
				origin: typeof location !== "undefined" ? location.origin : ""
			})) : "";
			const previewBodyHtml = kind === "video" ? `<div class="file-preview-body" style="padding:18px 14px;background:#0f172a;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
               <video class="file-preview-video" data-hls-src="${esc$1(videoHlsSrc(preview, mt))}" data-fallback-src="${esc$1(videoPreviewSrc(preview, mt))}" data-video-bytes="${Number(preview.size || 0)}" data-dsh-universal-direct="${preview.videoProbe?.universalDirectPlay ? "1" : "0"}" controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="onSmartVideoLoadedMeta(this)" onerror="onSmartVideoError(this)"></video>
               <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">
                 <span data-dsh-video-status="1" style="font-size:12px;color:#94a3b8;">🎬 ${esc$1(formatBytes(preview.size))} · ${esc$1(videoMetaUi.badge)}</span>
                 <button type="button" class="media-toolbar-pill" onclick="switchVideoTranscodeMode('${esc$1(host.hostId)}', false)">${esc$1(videoMetaUi.toggleLabel)}</button>
                 ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc$1(dlUrl)}', '${esc$1(preview.name || "video.mp4")}', this)">⬇️ 保存/分享视频</button>` : ""}
               </div>
             </div>` : kind === "image" ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
                 <img class="saveable-preview-img" src="${imagePreviewSrc(preview, mt)}" data-download-url="${esc$1(dlUrl || imagePreviewSrc(preview, mt))}" data-file-name="${esc$1(preview.name || "image.png")}" alt="${esc$1(preview.name)}" style="max-width:100%;max-height:62vh;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.textContent='⚠️ 图片预览已过期，请返回文件列表重新点击加载';" />
                 <div class="file-preview-meta-bar" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#94a3b8;">
                   <span>${esc$1(formatBytes(preview.size))} · 长按或点按钮保存图片</span>
                   <button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc$1(dlUrl || imagePreviewSrc(preview, mt))}', '${esc$1(preview.name || "image.png")}', this)">⬇️ 保存图片</button>
                   ${canToggleOrigImg ? `<button type="button" class="media-toolbar-pill" onclick="toggleOriginalPreviewImage('${esc$1(host.hostId)}', false)">${preview._origImage ? "⚡ 切回智能省流图" : "🔍 查看无损原图"}</button>` : ""}
                 </div>
               </div>` : kind === "binary" ? `<div class="file-preview-body" style="padding:36px 16px;background:#0f172a;color:#94a3b8;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                   <div style="font-size:36px;">📦</div>
                   <div style="font-size:14.5px;font-weight:600;color:#e2e8f0;">${esc$1(preview.name)}</div>
                   <div style="font-size:13px;">二进制文件（${esc$1(formatBytes(preview.size))}），不支持直接文本预览</div>
                   ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc$1(dlUrl)}', '${esc$1(preview.name || "file")}', this)">⬇️ 保存/分享文件</button>` : ""}
                 </div>` : isHtml && !rawHtmlMode ? `<div class="file-preview-body html-sandbox-preview" style="padding:0;background:#ffffff;min-height:calc(100% - 44px);">
                   <iframe title="${esc$1(preview.name || "HTML Preview")}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer" srcdoc="${htmlSrcdocAttr}" style="width:100%;height:calc(100vh - 150px);min-height:460px;border:none;background:#ffffff;display:block;"></iframe>
                 </div>` : isMarkdown && !rawMdMode ? `<div class="file-preview-body walkthrough-md-preview md-body" style="padding:16px 14px;background:var(--card-bg, #ffffff);color:var(--text, #0f172a);min-height:calc(100% - 44px);overflow-x:auto;">
                     ${formatAssistantText(preview.content || "")}
                   </div>` : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:calc(100% - 44px);overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.65;">
                     ${numberedHtml}
                   </div>`;
			container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;gap:6px;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="closeMainFilePreview('${esc$1(host.hostId)}')">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(preview.name)}</span>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              ${isHtml ? `<button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="openFullscreenHtmlFromPreview('${esc$1(host.hostId)}', false)">⛶ 全屏体验</button><button class="icon-pill-btn" onclick="toggleHtmlPreviewMode()">${rawHtmlMode ? "🌐 预览" : "</> 源码"}</button>` : ""}
              ${isMarkdown ? `<button class="icon-pill-btn" onclick="toggleMdPreviewMode()">${rawMdMode ? "📖 渲染" : "</> 源码"}</button>` : ""}
              ${kind !== "text" ? "" : `<button class="icon-pill-btn" onclick="copyCodeText('${encodeURIComponent(preview.content || "")}')">📋 复制</button>`}
              <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="askAiAboutFile('${esc$1(host.hostId)}', '${esc$1(fileProjectCwd)}', '${esc$1(preview.relPath || preview.name)}')">💬 让 AI 分析</button>
            </div>
          </div>
          ${previewBodyHtml}
        `;
			if (isMarkdown && !rawMdMode && firstSession) hydrateInlineChatImages({
				...firstSession,
				hostId: host.hostId
			}, container);
			else if (kind === "video") {
				const vidEl = container.querySelector("video.file-preview-video");
				if (vidEl) mountSmartVideoElement(vidEl);
			}
			return;
		}
		container.dataset.dshPreviewKey = "";
		const listing = host.lastFsListing;
		const entries = listing?.entries || [];
		const loadingDir = fileLoading && fileLoading.hostId === host.hostId && !fileLoading.drawer;
		const rootCwd = listing?.rootCwd || fileProjectCwd;
		const activeSubDir = loadingDir ? fileLoading.subDir || "" : listing?.subDir || "";
		const filesListKey = `${host.hostId}:${fileProjectCwd}:${rootCwd}:${activeSubDir}:${loadingDir ? 1 : 0}:${listing?.at || 0}:${entries.length}:${projects.map((p) => p.cwd).join(",")}`;
		if (container.dataset.dshFilesListKey === filesListKey && container.querySelector(".breadcrumbs-bar")) return;
		container.dataset.dshFilesListKey = filesListKey;
		const dirNavKey = `${host.hostId}:${rootCwd}:${activeSubDir}`;
		const sameDirAsBefore = container.dataset.dshDirNavKey === dirNavKey;
		container.dataset.dshDirNavKey = dirNavKey;
		const prevScrollTop = sameDirAsBefore ? container.scrollTop : 0;
		const crumbs = buildBreadcrumbSegments(activeSubDir);
		const projectPillsHtml = `
        <div class="filter-strip" style="border-bottom:1px solid var(--hairline);">
          ${projects.map((p) => `
            <button class="filter-pill ${p.cwd === fileProjectCwd ? "active" : ""}" onclick="requestDirList('${esc$1(host.hostId)}', '${esc$1(agentId)}', '${esc$1(p.cwd)}', '')">📁 ${esc$1(p.name)}</button>
          `).join("")}
        </div>
      `;
		const breadcrumbHtml = `
        <div class="breadcrumbs-bar">
          <span class="crumb-link" onclick="requestDirList('${esc$1(host.hostId)}', '${esc$1(agentId)}', '${esc$1(rootCwd)}', '')">🏠 根目录</span>
          ${crumbs.map((c, index) => {
			return "<span style=\"color:#94a3b8;\">/</span>" + (index === crumbs.length - 1 ? `<span style="font-weight:600;color:var(--text);">${esc$1(c.name)}</span>` : `<span class="crumb-link" onclick="requestDirList('${esc$1(host.hostId)}', '${esc$1(agentId)}', '${esc$1(rootCwd)}', '${esc$1(c.path)}')">${esc$1(c.name)}</span>`);
		}).join("")}
          ${crumbs.length === 0 ? `<span style="color:#94a3b8;margin-left:auto;font-family:monospace;">${esc$1(rootCwd)}</span>` : ""}
        </div>
      `;
		const listHtml = loadingDir ? fileLoadingSpinnerHtml(activeSubDir ? `正在读取 ${activeSubDir} …` : "正在读取目录…") : entries.map((e) => `
        <div class="file-row" onclick="clickRealFileEntry('${esc$1(host.hostId)}', '${esc$1(agentId)}', '${esc$1(listing?.rootCwd || fileProjectCwd)}', '${esc$1(e.relPath)}', ${Boolean(e.isDirectory)}, false)">
          <div class="file-row-left">
            <span style="font-size:18px;">${fileEntryIcon(e)}</span>
            <span style="font-weight:500;">${esc$1(e.name)}</span>
          </div>
          <span style="font-size:12px;color:#94a3b8;">${e.isDirectory ? "目录" : formatBytes(e.size)} ›</span>
        </div>
      `).join("") || `<div style="padding:36px;text-align:center;color:#94a3b8;">点击上方项目胶囊加载远程目录...</div>`;
		container.innerHTML = projectPillsHtml + breadcrumbHtml + `<div>${listHtml}</div>`;
		container.scrollTop = prevScrollTop;
	}
	function closeMainFilePreview(hostId) {
		delete pinnedMainPreviewByHost[hostId];
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		if (host?.lastFilePreview) host.lastFilePreview._showInMain = false;
		renderAll();
	}
	function askAiAboutFile(hostId, cwd, fileName) {
		if (desktopStageMode === "code") switchDesktopStage("chat");
		switchTab("chats");
		newTaskHostId = hostId;
		newTaskCwd = cwd;
		openNewTaskSheet();
		document.getElementById("newTaskInput").value = `请帮我阅读并分析 @${fileName} 文件，看看有没有可以优化的地方：`;
	}
	function switchDesktopStage(mode) {
		desktopStageMode = mode;
		document.getElementById("stageBtnChat").classList.toggle("active", mode === "chat");
		document.getElementById("stageBtnCode").classList.toggle("active", mode === "code");
		const chatBox = document.getElementById("chatMessages");
		const composer = document.getElementById("chatComposerBar");
		const codePane = document.getElementById("desktopStageCodePane");
		if (mode === "code") {
			chatBox.style.display = "none";
			composer.style.display = "none";
			renderAttachmentStrip("chat");
			codePane.style.display = "block";
			const found = findSessionGlobal(activeSessionId);
			if (found) {
				fileProjectCwd = found.session.cwd;
				requestDirList(found.session.hostId, found.session.id, found.session.cwd, "");
			}
			renderFilesTab(codePane);
		} else {
			chatBox.style.display = "flex";
			composer.style.display = "flex";
			codePane.style.display = "none";
			renderAttachmentStrip("chat");
		}
	}
	function openNewTaskSheet() {
		const hosts = hubState.hosts || [];
		if (!newTaskHostId || !hosts.some((h) => h.hostId === newTaskHostId)) newTaskHostId = currentHostId !== "ALL_HOSTS" ? currentHostId : hosts[0]?.hostId || "";
		const projects = getHostProjects(hosts.find((h) => h.hostId === newTaskHostId));
		if (!newTaskCwd && projects[0]) newTaskCwd = projects[0].cwd;
		renderNewTaskForm();
		renderAttachmentStrip("newTask");
		openSheet("newTaskSheet");
		if (!window.matchMedia?.("(max-width: 768px)")?.matches) setTimeout(() => document.getElementById("newTaskInput")?.focus(), 100);
	}
	function renderNewTaskForm() {
		const hosts = hubState.hosts || [];
		const hostChips = document.getElementById("newTaskHostChips");
		if (hosts.length === 0) {
			if (hostChips) hostChips.innerHTML = `
            <div style="font-size:12px;color:#b45309;background:var(--amber-soft);padding:4px 8px;border-radius:6px;width:100%;">
              ⚠️ 暂无在线电脑
            </div>
          `;
		} else if (hostChips) {
			const shortHostMap = buildShortHostNameMap(hosts);
			hostChips.innerHTML = hosts.map((h) => {
				const shortName = shortHostMap[h.hostId] || h.hostName;
				return `
            <button type="button" class="context-chip ${h.hostId === newTaskHostId ? "selected" : ""}" title="${esc$1(h.hostName)}" onclick="selectNewTaskHost('${esc$1(h.hostId)}')">
              🟢 ${esc$1(shortName)}
            </button>
          `;
			}).join("");
		}
		const harnessChips = document.getElementById("newTaskHarnessChips");
		if (harnessChips) harnessChips.innerHTML = [
			{
				id: "antigravity-ide",
				label: "IDE"
			},
			{
				id: "codex",
				label: "Codex"
			},
			{
				id: "workbuddy",
				label: "WorkBuddy"
			},
			{
				id: "claude",
				label: "Claude"
			},
			{
				id: "dsh",
				label: "DSH"
			}
		].map((opt) => `
          <button type="button" class="context-chip ${opt.id === newTaskHarness ? "selected" : ""}" onclick="selectNewTaskHarness('${opt.id}')">
            ${renderHarnessBadgeHtml(opt.id, "chip")} ${esc$1(opt.label)}
          </button>
        `).join("");
		const projects = getHostProjects(hosts.find((h) => h.hostId === newTaskHostId));
		if (!newTaskCwd && projects[0]) {
			newTaskCwd = projects[0].cwd;
			newTaskCustomIsNew = false;
		}
		const moreBtn = document.getElementById("newTaskProjMoreBtn");
		if (moreBtn) moreBtn.textContent = `全部 (${projects.length}) ▾`;
		const projChips = document.getElementById("newTaskProjectChips");
		if (projChips) {
			const isKnownProj = projects.some((p) => p.cwd === newTaskCwd);
			projChips.innerHTML = (newTaskCwd && !isKnownProj ? (() => {
				const folderLabel = newTaskCwd.replace(/[/\\]+$/, "").split(/[/\\]/).pop() || newTaskCwd;
				const prefix = newTaskCustomIsNew ? `✨ 新建：${folderLabel}` : `📂 ${folderLabel}`;
				return `<button type="button" class="new-task-proj-pill selected" title="${esc$1(newTaskCwd)}" onclick="selectNewTaskProject('${esc$1(newTaskCwd)}', ${newTaskCustomIsNew ? "true" : "false"})">${esc$1(prefix)}</button>`;
			})() : "") + projects.map((p) => `
          <button type="button" class="new-task-proj-pill ${p.cwd === newTaskCwd ? "selected" : ""}" title="${esc$1(p.name)} (${esc$1(p.cwd)})" onclick="selectNewTaskProject('${esc$1(p.cwd)}', false)">
            📁 ${esc$1(formatCompactProjectLabel(p.name))}
          </button>
        `).join("");
			const selBtn = projChips.querySelector(".new-task-proj-pill.selected");
			if (selBtn) setTimeout(() => selBtn.scrollIntoView?.({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth"
			}), 50);
		}
		const pathBar = document.getElementById("newTaskSelectedPathBar");
		if (pathBar) pathBar.textContent = newTaskCwd ? newTaskCustomIsNew ? `📍 将创建新工作区：${newTaskCwd}` : `📍 当前工作区：${newTaskCwd}` : "";
		updateNewTaskModelPill();
		if (langPref === "en") applyLangToDom(document.getElementById("newTaskSheet"), langPref);
	}
	let newTaskProjectSearchQuery = "";
	let newTaskPickerMode = "recent";
	let newTaskBrowseDir = "";
	let newTaskBrowseLoading = false;
	let newTaskBrowseError = "";
	let newTaskBrowseEntries = [];
	let newTaskBrowseReqSeq = 0;
	let newTaskCreateParentDir = "";
	let newTaskCreateFolderName = "";
	let newTaskCustomIsNew = false;
	function inferHostHomeDir(host, projects = []) {
		const candidates = [...(projects || []).map((p) => p.cwd).filter(Boolean), ...(host?.bridgeState?.workspaces || []).map((w) => w?.cwd).filter(Boolean)];
		for (const c of candidates) {
			const unixHome = /^(\/(?:Users|home)\/[^/]+)/.exec(c);
			if (unixHome) return unixHome[1];
			const winHome = /^([A-Za-z]:\\Users\\[^\\]+)/i.exec(c);
			if (winHome) return winHome[1];
		}
		if (candidates[0]) {
			const clean = candidates[0].replace(/[/\\]+$/, "");
			const idx = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
			if (idx > 0) return clean.slice(0, idx);
			return clean;
		}
		return "~";
	}
	function computeParentDirPath(dirPath = "") {
		const clean = String(dirPath || "").replace(/[/\\]+$/, "");
		if (!clean || clean === "/" || clean === "~" || /^[A-Za-z]:$/i.test(clean)) return "";
		const sepChar = clean.includes("\\") ? "\\" : "/";
		const idx = clean.lastIndexOf(sepChar);
		if (idx < 0) return "";
		if (idx === 0) return "/";
		const parent = clean.slice(0, idx);
		if (/^[A-Za-z]:$/i.test(parent)) return parent + "\\";
		return parent;
	}
	function joinRemotePath(baseDir = "", childName = "", homeFallback = "~") {
		const rawChild = String(childName || "").trim();
		if (!rawChild) return String(baseDir || "").trim();
		if (rawChild.startsWith("/") || /^[A-Za-z]:[/\\]/.test(rawChild)) return rawChild.replace(/[/\\]+$/, "") || "/";
		if (rawChild === "~" || rawChild.startsWith("~/") || rawChild.startsWith("~\\")) {
			if (homeFallback && homeFallback !== "~") {
				const sepChar = homeFallback.includes("\\") ? "\\" : "/";
				const rest = rawChild.slice(2).replace(/^[/\\]+/, "");
				return rest ? `${homeFallback.replace(/[/\\]+$/, "")}${sepChar}${rest}` : homeFallback;
			}
			return rawChild;
		}
		const base = String(baseDir || homeFallback || "~").replace(/[/\\]+$/, "");
		const sepChar = base.includes("\\") ? "\\" : "/";
		return base === "/" ? `/${rawChild}` : `${base}${sepChar}${rawChild}`;
	}
	async function browseNewTaskDir(targetDir) {
		const host = (hubState.hosts || []).find((h) => h.hostId === newTaskHostId);
		if (!host) return;
		const projects = getHostProjects(host);
		const dirToLoad = String(targetDir || "").trim() || newTaskBrowseDir || inferHostHomeDir(host, projects);
		newTaskBrowseDir = dirToLoad;
		newTaskBrowseLoading = true;
		newTaskBrowseError = "";
		const seq = ++newTaskBrowseReqSeq;
		renderNewTaskProjectPickerList();
		try {
			const qp = new URLSearchParams({
				cwd: dirToLoad,
				path: ""
			});
			const res = await apiFetch(`/api/hosts/${encodeURIComponent(host.hostId)}/fs/list?${qp.toString()}`);
			const data = await res.json().catch(() => ({}));
			if (seq !== newTaskBrowseReqSeq) return;
			if (!res.ok || data?.ok === false) {
				newTaskBrowseError = data?.error || `读取目录失败 (HTTP ${res.status})`;
				newTaskBrowseEntries = [];
			} else {
				if (data.rootCwd) newTaskBrowseDir = data.rootCwd;
				newTaskCreateParentDir = newTaskBrowseDir;
				newTaskBrowseEntries = Array.isArray(data.entries) ? data.entries.filter((e) => e && e.isDirectory) : [];
			}
		} catch (err) {
			if (seq !== newTaskBrowseReqSeq) return;
			newTaskBrowseError = err?.message || "读取目录失败";
			newTaskBrowseEntries = [];
		} finally {
			if (seq === newTaskBrowseReqSeq) {
				newTaskBrowseLoading = false;
				renderNewTaskProjectPickerList();
			}
		}
	}
	function switchNewTaskPickerMode(mode = "recent") {
		newTaskPickerMode = mode === "browse" || mode === "create" ? mode : "recent";
		const host = (hubState.hosts || []).find((h) => h.hostId === newTaskHostId);
		const homeGuess = inferHostHomeDir(host, getHostProjects(host));
		if (!newTaskBrowseDir) newTaskBrowseDir = homeGuess;
		if (!newTaskCreateParentDir) newTaskCreateParentDir = newTaskBrowseDir || homeGuess;
		document.getElementById("newTaskTabRecent")?.classList.toggle("active", newTaskPickerMode === "recent");
		document.getElementById("newTaskTabBrowse")?.classList.toggle("active", newTaskPickerMode === "browse");
		document.getElementById("newTaskTabCreate")?.classList.toggle("active", newTaskPickerMode === "create");
		const searchWrap = document.getElementById("newTaskPickerSearchWrap");
		if (searchWrap) searchWrap.style.display = newTaskPickerMode === "recent" ? "block" : "none";
		if (newTaskPickerMode === "browse") {
			browseNewTaskDir(newTaskBrowseDir);
			return;
		}
		renderNewTaskProjectPickerList();
		if (newTaskPickerMode === "create") setTimeout(() => document.getElementById("newTaskNewWsNameInput")?.focus(), 100);
	}
	function openNewTaskProjectPickerSheet(initialMode = "recent") {
		newTaskProjectSearchQuery = "";
		const input = document.getElementById("newTaskProjectSearchInput");
		if (input) input.value = "";
		openSheet("newTaskProjectPickerSheet");
		switchNewTaskPickerMode(initialMode);
		if (initialMode === "recent" && input && !window.matchMedia?.("(max-width: 768px)")?.matches) setTimeout(() => input.focus(), 150);
	}
	function filterNewTaskProjects(query) {
		newTaskProjectSearchQuery = String(query || "").trim().toLowerCase();
		renderNewTaskProjectPickerList();
	}
	function selectBrowsedNewTaskDir(dirPath) {
		const clean = String(dirPath || newTaskBrowseDir || "").trim();
		if (!clean) return;
		newTaskCwd = clean;
		newTaskCustomIsNew = false;
		renderNewTaskForm();
		closeSheet("newTaskProjectPickerSheet");
	}
	function openCreateUnderCurrentBrowseDir() {
		if (newTaskBrowseDir) newTaskCreateParentDir = newTaskBrowseDir;
		switchNewTaskPickerMode("create");
	}
	function onNewWorkspaceInput(val) {
		newTaskCreateFolderName = String(val || "");
		const host = (hubState.hosts || []).find((h) => h.hostId === newTaskHostId);
		const homeGuess = inferHostHomeDir(host, getHostProjects(host));
		const targetPath = joinRemotePath(newTaskCreateParentDir || homeGuess, newTaskCreateFolderName, homeGuess);
		const previewEl = document.getElementById("newTaskCreateResolvedPreview");
		if (previewEl) previewEl.textContent = newTaskCreateFolderName.trim() ? langPref === "en" ? `📍 Will create workspace: ${targetPath}` : `📍 将创建新工作区：${targetPath}` : langPref === "en" ? `📍 Parent: ${newTaskCreateParentDir || homeGuess}` : `📍 父目录：${newTaskCreateParentDir || homeGuess}`;
	}
	function confirmCreateNewWorkspace() {
		const raw = String(newTaskCreateFolderName || document.getElementById("newTaskNewWsNameInput")?.value || "").trim();
		if (!raw) {
			showToast(langPref === "en" ? "⚠️ Please enter a new folder name or path" : "⚠️ 请输入新工作区文件夹名称或路径");
			document.getElementById("newTaskNewWsNameInput")?.focus();
			return;
		}
		const host = (hubState.hosts || []).find((h) => h.hostId === newTaskHostId);
		const homeGuess = inferHostHomeDir(host, getHostProjects(host));
		newTaskCwd = joinRemotePath(newTaskCreateParentDir || homeGuess, raw, homeGuess);
		newTaskCustomIsNew = true;
		newTaskCreateFolderName = "";
		renderNewTaskForm();
		closeSheet("newTaskProjectPickerSheet");
	}
	function renderNewTaskProjectPickerList() {
		const body = document.getElementById("newTaskProjectPickerBody");
		if (!body) return;
		const host = (hubState.hosts || []).find((h) => h.hostId === newTaskHostId);
		const projects = getHostProjects(host);
		const homeGuess = inferHostHomeDir(host, projects);
		if (newTaskPickerMode === "browse") {
			const curDir = newTaskBrowseDir || homeGuess;
			const parentDir = computeParentDirPath(curDir);
			body.innerHTML = `
        <div style="padding:10px 12px;background:var(--subtle);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;">
          <div style="font-size:11.5px;color:var(--muted);word-break:break-all;margin-bottom:8px;">📂 ${esc$1(curDir)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="pill-action-btn primary" style="flex:1;justify-content:center;padding:7px 12px;font-size:12.5px;" onclick="selectBrowsedNewTaskDir('${esc$1(curDir)}')">✓ 选定此目录作为工作区</button>
            <button type="button" class="pill-action-btn" style="padding:7px 10px;font-size:12.5px;" onclick="openCreateUnderCurrentBrowseDir()">＋ 新工作区</button>
          </div>
        </div>
        ${parentDir ? `
          <div class="host-option" onclick="browseNewTaskDir('${esc$1(parentDir)}')">
            <div style="font-size:13px;font-weight:600;color:var(--primary);">⬆️ 返回上一级目录</div>
            <span style="font-size:11px;color:var(--muted);margin-left:auto;max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(parentDir)}</span>
          </div>
        ` : ""}
        ${newTaskBrowseLoading ? fileLoadingSpinnerHtml("正在读取电脑目录…") : newTaskBrowseError ? `
          <div style="padding:18px 12px;text-align:center;color:#dc2626;font-size:12.5px;">⚠️ ${esc$1(newTaskBrowseError)}</div>
        ` : newTaskBrowseEntries.length === 0 ? `
          <div style="padding:20px 12px;text-align:center;color:var(--muted);font-size:12.5px;">此目录下暂无子文件夹</div>
        ` : newTaskBrowseEntries.map((dir) => {
				return `
            <div class="host-option" onclick="browseNewTaskDir('${esc$1(joinRemotePath(curDir, dir.name, homeGuess))}')">
              <div style="min-width:0;flex:1;display:flex;align-items:center;gap:8px;">
                <span>📁</span>
                <span style="font-size:13.5px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(dir.name)}</span>
              </div>
              <span style="font-size:12px;color:var(--muted);">›</span>
            </div>
          `;
			}).join("")}
      `;
			if (langPref === "en") applyLangToDom(body, langPref);
			return;
		}
		if (newTaskPickerMode === "create") {
			const parentDir = newTaskCreateParentDir || homeGuess;
			const previewTarget = newTaskCreateFolderName.trim() ? `📍 将创建新工作区：${joinRemotePath(parentDir, newTaskCreateFolderName, homeGuess)}` : `📍 父目录：${parentDir}`;
			body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;padding:4px 2px 8px;">
          <div style="padding:10px 12px;background:var(--subtle);border:1px solid var(--border);border-radius:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">📂 父级目录（新文件夹将建在此目录下）</span>
              <button type="button" class="proj-header-more-btn" onclick="switchNewTaskPickerMode('browse')">更改父目录…</button>
            </div>
            <div style="font-size:12px;color:var(--text);word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc$1(parentDir)}</div>
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">📝 新项目文件夹名称（或直接填完整路径）</div>
            <input
              type="text"
              class="auth-input"
              id="newTaskNewWsNameInput"
              value="${esc$1(newTaskCreateFolderName)}"
              placeholder="例如：my-new-app 或 ~/projects/demo"
              style="margin:0;"
              oninput="onNewWorkspaceInput(this.value)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();confirmCreateNewWorkspace();}"
            />
            <div id="newTaskCreateResolvedPreview" style="margin-top:8px;font-size:11.5px;color:var(--primary);word-break:break-all;">${esc$1(previewTarget)}</div>
          </div>
          <button type="button" class="primary-block-btn" onclick="confirmCreateNewWorkspace()">✨ 创建并选定新工作区</button>
        </div>
      `;
			if (langPref === "en") applyLangToDom(body, langPref);
			return;
		}
		const q = newTaskProjectSearchQuery;
		const filtered = projects.filter((p) => !q || p.name.toLowerCase().includes(q) || p.cwd.toLowerCase().includes(q));
		if (filtered.length === 0) {
			body.innerHTML = `
        <div style="padding:20px 12px;text-align:center;color:var(--muted);font-size:13px;">
          <div style="margin-bottom:12px;">未找到匹配的项目文件夹</div>
          <div style="display:flex;gap:8px;justify-content:center;">
            <button type="button" class="pill-action-btn" onclick="switchNewTaskPickerMode('browse')">📂 选择目录</button>
            <button type="button" class="pill-action-btn primary" onclick="switchNewTaskPickerMode('create')">＋ 新工作区</button>
          </div>
        </div>
      `;
			if (langPref === "en") applyLangToDom(body, langPref);
			return;
		}
		body.innerHTML = filtered.map((p) => {
			const isSel = p.cwd === newTaskCwd;
			return `
        <div class="host-option ${isSel ? "selected" : ""}" onclick="selectNewTaskProject('${esc$1(p.cwd)}', false); closeSheet('newTaskProjectPickerSheet');">
          <div style="min-width:0;flex:1;">
            <div style="font-size:13.5px;font-weight:700;color:var(--text);">📁 ${esc$1(p.name)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(p.cwd)}</div>
          </div>
          ${isSel ? "<span style=\"color:var(--primary);font-weight:700;margin-left:8px;\">✓</span>" : ""}
        </div>
      `;
		}).join("");
		if (langPref === "en") applyLangToDom(body, langPref);
	}
	function selectNewTaskHost(id) {
		newTaskHostId = id;
		newTaskCwd = "";
		newTaskCustomIsNew = false;
		newTaskBrowseDir = "";
		newTaskCreateParentDir = "";
		renderNewTaskForm();
	}
	function selectNewTaskHarness(h) {
		newTaskHarness = h;
		newTaskModel = "";
		renderNewTaskForm();
	}
	function selectNewTaskProject(cwd, isNew = false) {
		newTaskCwd = cwd;
		newTaskCustomIsNew = Boolean(isNew);
		renderNewTaskForm();
	}
	function fillQuickPrompt(text) {
		const box = document.getElementById("newTaskInput");
		box.value = text;
		box.focus();
	}
	async function submitNewTask() {
		if (isDictationActiveFor("newTaskInput")) await flushVoiceInputBeforeSend("newTaskInput");
		else stopVoiceInput();
		const inputEl = document.getElementById("newTaskInput");
		const rawText = inputEl ? inputEl.value.trim() : "";
		const pendingAttachments = composerAttachments.newTask.slice();
		if (!newTaskHostId || (hubState.hosts || []).length === 0) {
			showToast("⚠️ 请先接入一台电脑后再创建远程任务");
			return;
		}
		if (!rawText && pendingAttachments.length === 0) {
			showToast("请输入任务指令或上传截图");
			return;
		}
		const text = rawText || "请查看我上传的截图并帮我分析处理。";
		if (inputEl) inputEl.value = "";
		composerAttachments.newTask = [];
		renderAttachmentStrip("newTask");
		closeSheet("newTaskSheet");
		showToast(`🚀 正在远程电脑 (${newTaskHarness === "antigravity-ide" ? "Antigravity IDE" : newTaskHarness === "codex" ? "OpenAI Codex" : newTaskHarness === "workbuddy" ? "WorkBuddy" : newTaskHarness === "claude" ? "Claude Code" : "DeepSeek Harness"}) 创建新任务...`);
		let dispatchRes = null;
		try {
			dispatchRes = await dispatchHostCommand(newTaskHostId, {
				type: "new_session",
				harness: newTaskHarness,
				cwd: newTaskCwd,
				...newTaskCustomIsNew ? { createDir: true } : {},
				title: text.slice(0, 28),
				prompt: text,
				...newTaskModel ? { model: newTaskModel } : {},
				...pendingAttachments.length > 0 ? { attachments: pendingAttachments.map((a) => ({
					name: a.name,
					mimeType: a.mimeType,
					dataBase64: a.dataBase64
				})) } : {}
			});
		} catch (err) {
			dispatchRes = {
				ok: false,
				error: err?.message || "网络请求失败"
			};
		}
		if (!dispatchRes || dispatchRes.ok === false) {
			if (inputEl && !inputEl.value.trim() && rawText) inputEl.value = rawText;
			if (pendingAttachments.length > 0 && composerAttachments.newTask.length === 0) {
				composerAttachments.newTask = pendingAttachments;
				renderAttachmentStrip("newTask");
			}
			openSheet("newTaskSheet");
			showToast("❌ 创建任务失败：" + (dispatchRes?.error || "请重试"));
			return;
		}
		setTimeout(fetchState, 800);
	}
	function openCurrentSessionActions() {
		if (activeSessionId) openSessionActions(activeSessionId);
	}
	function openSessionActions(sessionId) {
		const found = findSessionGlobal(sessionId);
		if (!found) return;
		actionTargetSession = found.session;
		actionTargetHostId = found.session.hostId;
		confirmSheetDelete = false;
		renderActionSheet();
		openSheet("taskActionSheet");
	}
	function renderActionSheet() {
		const s = actionTargetSession;
		if (!s) return;
		document.getElementById("actionSheetTitle").innerHTML = `
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$1(s.title)}</span>
        <button style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;" onclick="closeSheet('taskActionSheet')">✕</button>
      `;
		document.getElementById("actionSheetBody").innerHTML = `
        <div style="margin-bottom:10px;display:flex;gap:6px;">
          <input id="renameInlineInput" value="${esc$1(s.title)}" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-size:15px;outline:none;" />
          <button style="background:var(--primary);color:#fff;border:none;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer;" onclick="saveInlineRename()">保存标题</button>
        </div>
        <button class="action-item" onclick="togglePinTargetSession()">
          ${s.pinned ? "📌 取消置顶此对话" : "📌 置顶此对话（固定在列表最顶部）"}
        </button>
        <button class="action-item" onclick="shareTargetSession()">🔗 生成 AES-256 端到端加密回放链接</button>
        <button class="action-item" onclick="jumpToSessionFiles('${esc$1(s.hostId)}', '${esc$1(s.id)}', '${esc$1(s.cwd)}')">📂 查看【${esc$1(s.project)}】项目文件夹</button>
        <button class="action-item danger" onclick="deleteTargetSession()">
          ${confirmSheetDelete ? "⚠️ 再次点击确认彻底删除" : "🗑️ 删除此条会话记录"}
        </button>
      `;
	}
	function togglePinTargetSession() {
		if (!actionTargetSession) return;
		const id = actionTargetSession.id;
		pinnedMap[id] = !pinnedMap[id];
		try {
			localStorage.setItem("dsh_pinned_v4", JSON.stringify(pinnedMap));
		} catch {}
		closeSheet("taskActionSheet");
		showToast(pinnedMap[id] ? "📌 已置顶该对话" : "已取消置顶");
		renderAll();
	}
	async function saveInlineRename() {
		const val = document.getElementById("renameInlineInput").value.trim();
		if (!val || !actionTargetSession) return;
		closeSheet("taskActionSheet");
		showToast("✏️ 正在保存新标题...");
		await dispatchHostCommand(actionTargetHostId, {
			type: "rename_session",
			agentId: actionTargetSession.id,
			title: val
		});
		setTimeout(fetchState, 600);
	}
	async function shareTargetSession() {
		if (!actionTargetSession) return;
		const targetHost = (hubState.hosts || []).find((h) => h.hostId === actionTargetHostId);
		if (!targetHost || !targetHost.online || targetHost.activelyConnected === false) {
			showToast("⚠️ 该电脑当前离线或休眠，无法生成端到端加密分享");
			return;
		}
		const targetTitle = actionTargetSession.title || "会话回放";
		closeSheet("taskActionSheet");
		showToast("🔒 正在请求电脑加密并上传回放（约 1~5 秒）...");
		const cmdId = (await dispatchHostCommand(actionTargetHostId, {
			type: "share_session",
			agentId: actionTargetSession.id
		}))?.command?.id;
		if (!cmdId) return;
		for (let i = 0; i < 16; i++) {
			await new Promise((r) => setTimeout(r, 600));
			const res = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`)).json().catch(() => ({}));
			if (res.ready && res.result) {
				if (res.result.ok === false || !res.result.shareUrl) {
					showToast("❌ 分享生成失败：" + (res.result.error || "无法读取加密载荷"));
					return;
				}
				const fullUrl = res.result.shareUrl.startsWith("http") ? res.result.shareUrl : location.origin + res.result.shareUrl;
				fetchState();
				openShareResultSheet({
					url: fullUrl,
					title: targetTitle,
					shareId: res.result.shareId || ""
				});
				return;
			}
		}
		fetchState();
		showToast("⏳ 电脑仍在处理加密分享，稍后可在「设置 → 加密分享记录」查看");
	}
	function openShareResultSheet({ url, title = "端到端加密回放", shareId = "" } = {}) {
		const body = document.getElementById("shareResultBody");
		if (!body || !url) return;
		body.innerHTML = `
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.55;margin-bottom:10px;">
          会话 <strong>${esc$1(title)}</strong> 已完成 AES-256-GCM 端到端加密。<br/>
          <span style="font-size:11.5px;color:var(--muted);">🔐 解密密钥仅保存在链接 <code>#key=</code> 锚点中，云端服务器无法解密原始内容。</span>
        </div>
        <input
          type="text"
          readonly
          value="${esc$1(url)}"
          onclick="this.select()"
          style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-family:var(--mono);font-size:12px;margin-bottom:12px;outline:none;"
        />
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button
            class="primary-block-btn"
            style="margin-top:0;flex:1;"
            onclick="copyCodeText('${encodeURIComponent(url)}', '🔗 加密分享链接已复制到剪贴板！')"
          >
            📋 复制加密链接
          </button>
          <a
            href="${esc$1(url)}"
            target="_blank"
            rel="noopener"
            class="choice-chip"
            style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:0 16px;font-weight:700;"
          >
            🌐 打开预览
          </a>
        </div>
      `;
		openSheet("shareResultSheet");
	}
	async function deleteShareRecord(shareId) {
		if (!shareId) return;
		try {
			await apiFetch(`/api/shares/${encodeURIComponent(shareId)}`, { method: "DELETE" });
			showToast("🗑️ 已销毁该加密分享记录");
			lastRenderedSettingsKey = "";
			fetchState();
		} catch (err) {
			showToast("❌ 删除失败: " + (err && err.message || err));
		}
	}
	let pairingCountdownTimer = null;
	let activePairingCodeStr = "";
	let activePairingLink = "";
	async function openPairingCodeSheet() {
		openSheet("pairingCodeSheet");
		await generateNewPairingCode();
	}
	function closePairingCodeSheet() {
		if (pairingCountdownTimer) {
			clearInterval(pairingCountdownTimer);
			pairingCountdownTimer = null;
		}
		closeSheet("pairingCodeSheet");
	}
	function updatePairingQrBaseOrigin(rawOrigin) {
		if (!activePairingCodeStr) return;
		activePairingLink = `${String(rawOrigin || "").trim().replace(/\/+$/, "") || location.origin}/?pair=${encodeURIComponent(activePairingCodeStr)}`;
		const qrBox = document.getElementById("pairingQrSvgWrap");
		if (qrBox) qrBox.innerHTML = renderQrCodeSvg(activePairingLink, {
			sizePx: 184,
			margin: 3
		});
		const previewEl = document.getElementById("pairingFullLinkPreview");
		if (previewEl) previewEl.textContent = activePairingLink;
	}
	function copyCurrentPairingLink() {
		if (!activePairingLink) return;
		copyText(activePairingLink, {
			successMessage: "📋 手机免密登录链接已复制",
			title: "📋 复制手机免密登录链接"
		});
	}
	async function generateNewPairingCode() {
		if (pairingCountdownTimer) {
			clearInterval(pairingCountdownTimer);
			pairingCountdownTimer = null;
		}
		const body = document.getElementById("pairingCodeBody");
		if (!body) return;
		body.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);">正在生成 6 位免密配对码…</div>`;
		try {
			const res = await apiFetch("/api/pairing/create", {
				method: "POST",
				body: JSON.stringify({ ttlMs: 18e4 })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.ok || !data.code) {
				body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc$1(data.error || "请稍后重试")}</div>`;
				return;
			}
			const codeStr = String(data.code);
			activePairingCodeStr = codeStr;
			const expiresAt = Number(data.expiresAt || Date.now() + 18e4);
			const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "[::1]";
			const lanCandidates = Array.isArray(data.lanOrigins) && data.lanOrigins.length > 0 ? data.lanOrigins : Array.isArray(hubState.lanOrigins) ? hubState.lanOrigins : [];
			const defaultBaseOrigin = isLocalhost && lanCandidates[0] ? lanCandidates[0] : location.origin;
			activePairingLink = `${defaultBaseOrigin}/?pair=${encodeURIComponent(codeStr)}`;
			const qrSvgHtml = renderQrCodeSvg(activePairingLink, {
				sizePx: 184,
				margin: 3
			});
			const localhostNoticeHtml = isLocalhost ? lanCandidates[0] ? `<div id="pairingLocalhostNotice" style="text-align:left;font-size:11.5px;line-height:1.5;color:#b45309;background:var(--amber-soft);border:1px solid #fde68a;padding:8px 10px;border-radius:10px;margin-bottom:10px;">
                 📡 <strong>局域网自动修正</strong>：你当前在电脑上用 <code>${esc$1(location.hostname)}</code> 打开（手机扫 localhost 会连不上），已自动将二维码切换为本机局域网地址 <code>${esc$1(lanCandidates[0])}</code>。请确保手机与电脑连同一 Wi-Fi，或在下方改为公网/隧道地址：
               </div>` : `<div id="pairingLocalhostNotice" style="text-align:left;font-size:11.5px;line-height:1.5;color:#b45309;background:var(--amber-soft);border:1px solid #fde68a;padding:8px 10px;border-radius:10px;margin-bottom:10px;">
                 ⚠️ <strong>注意</strong>：你当前使用 <code>${esc$1(location.hostname)}</code> 打开，手机无法直接访问 localhost！请在下方把地址改为电脑的局域网 IP（如 <code>http://192.168.1.x:8080</code>）或公网域名后再扫码：
               </div>` : "";
			const renderCountdown = () => {
				const remainSec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1e3));
				const timerEl = document.getElementById("pairingCodeTimerText");
				if (timerEl) {
					timerEl.textContent = remainSec > 0 ? `⏳ 有效期剩余 ${remainSec} 秒（扫码或输入一次后即刻生效）` : "⚠️ 该二维码/配对码已过期，请点击下方重新生成";
					timerEl.style.color = remainSec > 0 ? "var(--primary)" : "var(--red)";
				}
				if (remainSec <= 0 && pairingCountdownTimer) {
					clearInterval(pairingCountdownTimer);
					pairingCountdownTimer = null;
				}
			};
			body.innerHTML = `
          <div style="text-align:center;padding:8px 4px 14px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">
              用手机相机直接<strong>扫下方二维码</strong>即可免输密码登录（也可在手机端输入 6 位码）：
            </div>
            ${localhostNoticeHtml}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;text-align:left;">
              <span style="font-size:11.5px;font-weight:600;color:var(--muted);white-space:nowrap;">扫码网址:</span>
              <input
                id="pairingBaseOriginInput"
                type="text"
                value="${esc$1(defaultBaseOrigin)}"
                oninput="updatePairingQrBaseOrigin(this.value)"
                style="flex:1;min-width:0;padding:6px 9px;border-radius:8px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-family:var(--mono);font-size:11.5px;outline:none;"
              />
            </div>
            <div id="pairingQrSvgWrap" style="display:flex;justify-content:center;margin:8px 0 12px;">
              ${qrSvgHtml}
            </div>
            <div
              style="font-family:var(--mono);font-size:28px;font-weight:800;letter-spacing:6px;padding:10px 12px;border-radius:12px;background:var(--primary-soft);color:var(--primary);border:1px solid var(--border);user-select:all;"
            >${esc$1(codeStr)}</div>
            <div id="pairingFullLinkPreview" style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all;">${esc$1(activePairingLink)}</div>
            <div id="pairingCodeTimerText" style="margin-top:8px;font-size:12.5px;font-weight:600;color:var(--primary);"></div>
            <div style="display:flex;gap:8px;margin-top:14px;">
              <button
                class="primary-block-btn"
                style="margin-top:0;flex:1;"
                onclick="copyCurrentPairingLink()"
              >
                📋 复制免密链接
              </button>
              <button
                class="choice-chip"
                style="padding:0 16px;font-weight:600;"
                onclick="generateNewPairingCode()"
              >
                🔄 重新生成
              </button>
            </div>
          </div>
        `;
			renderCountdown();
			applyLangToDom(body, langPref);
			pairingCountdownTimer = setInterval(() => {
				renderCountdown();
				if (langPref === "en") applyLangToDom(body, langPref);
			}, 1e3);
		} catch (err) {
			body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc$1(err && err.message || String(err))}</div>`;
			applyLangToDom(body, langPref);
		}
	}
	async function jumpToSessionFiles(hostId, agentId, cwd) {
		closeSheet("taskActionSheet");
		closeMobileChat();
		currentHostId = hostId;
		fileProjectCwd = cwd;
		switchTab("files");
		await requestDirList(hostId, agentId, cwd, "");
	}
	async function deleteTargetSession() {
		if (!confirmSheetDelete) {
			confirmSheetDelete = true;
			renderActionSheet();
			return;
		}
		if (!actionTargetSession) return;
		closeSheet("taskActionSheet");
		showToast("🗑️ 正在删除会话...");
		await dispatchHostCommand(actionTargetHostId, {
			type: "delete_session",
			agentId: actionTargetSession.id
		});
		if (activeSessionId === actionTargetSession.id) {
			activeSessionId = "";
			closeMobileChat();
		}
		setTimeout(fetchState, 600);
	}
	function toggleAddHostPanel() {
		addHostPanelExpanded = !addHostPanelExpanded;
		lastRenderedSettingsKey = "";
		renderSettingsTab();
	}
	function toggleHostSettingsCard(hostId) {
		if (!hostId) return;
		expandedHostCardIds[hostId] = !expandedHostCardIds[hostId];
		lastRenderedSettingsKey = "";
		renderSettingsTab();
	}
	function renderAddHostPanelHtml({ isEmptyState = false } = {}) {
		const enrollment = hubState.enrollment || {};
		const code = enrollment.code || "正在生成...";
		const expiresAt = Number(enrollment.expiresAt || 0);
		const remainMin = expiresAt > Date.now() ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 6e4)) : 15;
		const joinedCount = Number(enrollment.joinedCount || 0);
		const originUrl = location.origin;
		const oneLineCmd = `curl -fsSL ${originUrl}/install.sh | bash -s -- --code ${code}`;
		const localRepoCmd = `./connect-host.sh --url ${originUrl} --code ${code}`;
		const hasHosts = (hubState.hosts || []).length > 0;
		if (!(isEmptyState || !hasHosts || addHostPanelExpanded)) return `
          <div class="settings-card" style="padding:11px 13px;cursor:pointer;" onclick="toggleAddHostPanel()">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="min-width:0;flex:1;">
                <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;">
                  <span style="font-size:13.5px;font-weight:700;color:var(--text);">➕ 添加电脑</span>
                  <span style="font-family:var(--mono);font-size:11.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:var(--primary-soft);color:var(--primary);">${esc$1(code)}</span>
                </div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ⏳ ${remainMin}m有效 · 已连 ${joinedCount} 台 · 点此展开命令
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
                <button class="pill-action-btn primary" style="padding:5px 9px;font-size:11.5px;" onclick="event.stopPropagation(); copyCodeText('${encodeURIComponent(oneLineCmd)}', '📋 一行接入命令已复制！到电脑终端粘贴回车即可')">
                  📋 复制命令
                </button>
                <button class="pill-action-btn" style="padding:5px 8px;font-size:11.5px;" onclick="event.stopPropagation(); openPairingCodeSheet()">
                  📱 扫码
                </button>
                <span style="font-size:12px;color:var(--muted);padding-left:2px;">▾</span>
              </div>
            </div>
          </div>
        `;
		return `
        <div class="settings-card" style="padding:15px;${isEmptyState ? "max-width:440px;margin:20px auto;text-align:left;border:1.5px solid var(--primary);" : ""}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:14.5px;font-weight:800;color:var(--text);">
                ${isEmptyState ? "💻 本机未接入 · 3 步开启手机远控" : "➕ 添加电脑（凭配对码加入，无需主密码）"}
              </div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                每台电脑独立凭证可单机吊销；有效期内可连加多台电脑
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="pill-action-btn" style="font-size:11.5px;padding:4px 9px;" onclick="refreshEnrollmentCode()">
                🔄 换码
              </button>
              ${!isEmptyState && hasHosts ? `
                <button class="pill-action-btn" style="font-size:11.5px;padding:4px 9px;" onclick="toggleAddHostPanel()">
                  ▴ 收起
                </button>
              ` : ""}
            </div>
          </div>

          ${isEmptyState || !hasHosts ? `
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px;font-size:11.5px;line-height:1.4;">
          <div style="padding:7px 8px;border-radius:9px;background:var(--primary-soft);border:1px solid var(--border);color:var(--primary);font-weight:700;">
            ① 终端执行命令<br/><span style="font-weight:500;font-size:11px;color:var(--text-secondary);">复制下方一行命令</span>
          </div>
          <div style="padding:7px 8px;border-radius:9px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>② 自动连上刷新</strong><br/><span style="font-size:11px;color:var(--muted);">无需重启或手填</span>
          </div>
          <div style="padding:7px 8px;border-radius:9px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>③ 手机扫码遥控</strong><br/><span style="font-size:11px;color:var(--muted);">免输密码直接进</span>
          </div>
        </div>
      ` : ""}

          <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:110px;padding:7px 10px;border-radius:10px;background:var(--primary-soft);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">当前电脑配对码</div>
              <div style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--primary);letter-spacing:1.2px;margin-top:2px;">${esc$1(code)}</div>
            </div>
            <div style="padding:7px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">剩余有效期</div>
              <div style="font-size:13px;font-weight:700;color:var(--text);margin-top:3px;">⏳ ${remainMin} 分钟</div>
            </div>
            <div style="padding:7px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">本码已加入</div>
              <div style="font-size:13px;font-weight:700;color:var(--green);margin-top:3px;">💻 ${joinedCount} 台</div>
            </div>
          </div>

          <div style="font-size:11.5px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">
            在电脑终端执行这一行命令（自动安装、自动连上、开机自启）：
          </div>
          <div
            style="font-family:var(--mono);font-size:11.5px;line-height:1.45;padding:9px 11px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);word-break:break-all;margin-bottom:10px;user-select:all;"
          >${esc$1(oneLineCmd)}</div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="pill-action-btn primary" onclick="copyCodeText('${encodeURIComponent(oneLineCmd)}', '📋 一行接入命令已复制！到电脑终端粘贴回车即可')">
              📋 复制一行安装命令
            </button>
            <button class="pill-action-btn" onclick="copyCodeText('${encodeURIComponent(localRepoCmd)}', '📋 本地仓库接入命令已复制')">
              📋 已克隆仓库用此条
            </button>
            <button class="pill-action-btn" onclick="openPairingCodeSheet()">
              📱 手机扫码登录
            </button>
          </div>
        </div>
      `;
	}
	async function refreshEnrollmentCode() {
		try {
			const data = await (await apiFetch("/api/hosts/enrollment", {
				method: "POST",
				body: JSON.stringify({ forceNew: true })
			})).json().catch(() => ({}));
			if (data?.ok && data.enrollment) {
				hubState.enrollment = data.enrollment;
				lastRenderedSettingsKey = "";
				renderAll();
				showToast("🔄 已生成新的电脑配对码（15 分钟有效）");
			}
		} catch (err) {
			showToast("❌ 刷新配对码失败：" + (err && err.message || err));
		}
	}
	async function revokeHostCredential(hostId, hostName) {
		if (!hostId) return;
		if (!confirm(`确定要吊销电脑「${hostName || hostId}」的独立访问凭证吗？\n吊销后该电脑将立即无法上报或拉取指令（其他电脑不受影响）。`)) return;
		try {
			const data = await (await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/trust`, {
				method: "POST",
				body: JSON.stringify({ action: "revoke" })
			})).json().catch(() => ({}));
			if (data?.ok) {
				showToast(`🚫 已吊销「${hostName || hostId}」的独立凭证`);
				lastRenderedSettingsKey = "";
				fetchState();
			} else showToast("❌ 吊销失败：" + (data?.error || "请重试"));
		} catch (err) {
			showToast("❌ 吊销失败：" + (err && err.message || err));
		}
	}
	async function unrevokeHostCredential(hostId, hostName) {
		if (!hostId) return;
		try {
			if ((await (await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/trust`, {
				method: "POST",
				body: JSON.stringify({ action: "unrevoke" })
			})).json().catch(() => ({})))?.ok) {
				showToast(`✅ 已解除「${hostName || hostId}」的吊销状态`);
				lastRenderedSettingsKey = "";
				fetchState();
			}
		} catch (err) {
			showToast("❌ 操作失败：" + (err && err.message || err));
		}
	}
	function renderSettingsTab() {
		const hosts = hubState.hosts || [];
		const shares = hubState.shares || [];
		const buildInfo = hubState.build || {};
		const currentTk = getToken();
		const enrollmentCode = hubState.enrollment?.code || "";
		`${location.origin}${enrollmentCode}`;
		const settingsSignature = JSON.stringify({
			themePref,
			langPref,
			addHostPanelExpanded,
			expandedHostCardIds,
			tokenTail: currentTk.slice(-4),
			enrollmentCode,
			joinedCount: hubState.enrollment?.joinedCount || 0,
			pushCount: (hubState.pushSubscriptions || []).length,
			build: buildInfo.uiBuild || buildInfo.version || "",
			hosts: hosts.map((h) => ({
				id: h.hostId,
				name: h.hostName,
				online: h.online,
				trustStatus: h.trustStatus || h.trust?.status || "",
				hasDedicatedToken: Boolean(h.hasDedicatedToken),
				isFeishuActive: h.isFeishuActive,
				remoteActive: h.remoteActive,
				taskCount: (h.bridgeState?.tasks || []).length,
				runningCount: h.runningCount || 0,
				totalBytesBucket: expandedHostCardIds[h.hostId] ? Math.round((h.totalBytes || 0) / 10240) : 0,
				agentVersion: h.bridgeState?.agentVersion || "",
				upgrading: Boolean(upgradingHostMap[h.hostId] && Date.now() - upgradingHostMap[h.hostId] < 45e3),
				turbo: h.bridgeState?.turbo?.engineLabel || "",
				power: h.bridgeState?.systemTelemetry?.power?.shortLabel || "",
				net: h.bridgeState?.systemTelemetry?.network?.kindLabel || "",
				shareUrl: h.lastShareResult?.shareUrl || ""
			})),
			shares: shares.map((s) => ({
				id: s.id || s.shareId,
				at: s.createdAt
			}))
		});
		const viewport = document.getElementById("mainViewport");
		if (!viewport) return;
		if (settingsSignature === lastRenderedSettingsKey && viewport.querySelector(".settings-wrap")) {
			refreshPushStatus();
			return;
		}
		const prevScrollTop = viewport.scrollTop;
		lastRenderedSettingsKey = settingsSignature;
		const latestShareResults = hosts.filter((h) => h.lastShareResult && h.lastShareResult.shareUrl).map((h) => {
			const rawUrl = h.lastShareResult.shareUrl;
			const fullUrl = rawUrl.startsWith("http") ? rawUrl : location.origin + rawUrl;
			return {
				hostName: h.hostName,
				shareId: h.lastShareResult.shareId || "",
				fullUrl,
				at: h.lastShareResult.at || 0
			};
		});
		viewport.innerHTML = `
        <div class="settings-wrap">
          <div>
            <div class="settings-group-title">添加电脑与手机扫码登录</div>
            ${renderAddHostPanelHtml({ isEmptyState: false })}
          </div>

          <div>
            <div class="settings-group-title">已接入电脑 (${hosts.length} 台 · 点击卡片展开详情)</div>
            <div class="host-visual-grid">
              ${hosts.map((h) => {
			const isRevoked = (h.trustStatus || h.trust?.status) === "revoked";
			const isCardExpanded = Boolean(expandedHostCardIds[h.hostId]);
			const tm = formatHostTelemetry(h);
			const sessCount = (h.bridgeState?.tasks || []).length;
			const runCount = h.runningCount || 0;
			const turboShort = h.bridgeState?.turbo?.enabled ? "⚡ 极速" : "🐢 轮询";
			const shortFp = (h.fingerprint || "已锁定").slice(0, 14);
			const hubVer = String(buildInfo.version || "0.5.1");
			const hostVer = String(h.bridgeState?.agentVersion || "");
			const isUpgradingHost = Boolean(upgradingHostMap[h.hostId] && Date.now() - upgradingHostMap[h.hostId] < 45e3);
			const isHostOutdated = Boolean(h.online && !isRevoked && (!hostVer || compareSemver(hostVer, hubVer) < 0));
			const versionBadgeHtml = isUpgradingHost ? `<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--amber-soft);color:#d97706;">⏳ 正在升级重启...</span>` : isHostOutdated ? `<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--amber-soft);color:#d97706;">⬆️ 可升 v${esc$1(hubVer)} (${hostVer ? "当前 v" + esc$1(hostVer) : "旧版"})</span>` : hostVer ? `<span style="font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:999px;background:var(--green-soft);color:var(--green);">v${esc$1(hostVer)} 最新</span>` : "";
			return `
                <div class="host-visual-card ${h.isFeishuActive ? "active-feishu" : ""}" style="padding:12px 14px;">
                  <div
                    style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none;"
                    onclick="toggleHostSettingsCard('${esc$1(h.hostId)}')"
                  >
                    <div style="min-width:0;flex:1;">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="status-dot ${h.online && !isRevoked ? "" : "offline"}"></span>
                        <span style="font-size:14.5px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;">${esc$1(h.hostName)}</span>
                        ${h.isFeishuActive ? `<span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--primary-soft);color:var(--primary);">🎯 主控</span>` : ""}
                        ${isRevoked ? `<span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--red-soft);color:var(--red);">🚫 已吊销</span>` : ""}
                        ${versionBadgeHtml}
                      </div>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>${h.online ? `${tm.powerIcon} ${esc$1(tm.powerShort)}` : `⚪ 离线 (${formatTime(h.lastSeen)})`}</span>
                        <span>·</span>
                        <span>${tm.netIcon} ${esc$1(tm.netShort)}</span>
                        <span>·</span>
                        <span>💬 ${sessCount} 会话${runCount > 0 ? ` (<strong style="color:var(--green);">${runCount} 运行中</strong>)` : ""}</span>
                        <span>·</span>
                        <span>${turboShort}</span>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                      ${isHostOutdated && !isUpgradingHost ? `
                        <button
                          class="pill-action-btn primary"
                          style="padding:4px 9px;font-size:11.5px;"
                          onclick="event.stopPropagation(); upgradeHostTurbo('${esc$1(h.hostId)}', '${esc$1(h.hostName)}')"
                        >🔄 一键升级</button>
                      ` : ""}
                      <span style="font-size:11.5px;font-weight:600;color:var(--text-secondary);padding:4px 8px;border-radius:999px;background:var(--subtle);">
                        ${isCardExpanded ? "▴ 收起" : "▾ 详情"}
                      </span>
                    </div>
                  </div>

                  ${isCardExpanded ? `
                    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--hairline);display:flex;flex-direction:column;gap:10px;">
                      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:12px;">
                        <div style="padding:8px 10px;border-radius:10px;background:${tm.lowBattery ? "var(--amber-soft)" : "var(--subtle)"};border:1px solid ${tm.lowBattery ? "#fde68a" : "var(--border)"};">
                          <div style="font-size:11px;color:var(--muted);">供电与电量</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${tm.powerIcon} ${esc$1(tm.powerDetail)}${tm.lowBattery ? " ⚠️" : ""}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">网络与延迟</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${tm.netIcon} ${esc$1(tm.netDetail)}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">会话与存储</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${sessCount} 条 · ${runCount} 运行 · ${formatBytes(h.totalBytes)}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">同步与系统</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${esc$1(h.platform || "macOS")} ${esc$1(h.arch || "")} · ${turboShort}</div>
                        </div>
                      </div>

                      <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11.5px;">
                        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">${renderHarnessBadgeHtml("dsh", "inline")} DSH · ✅ 远控+审批</span>
                        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">${renderHarnessBadgeHtml("antigravity-ide", "inline")} Antigravity · ✅ 远控+审批</span>
                        ${(h.bridgeState?.harnesses || []).map((ad) => {
				const canApproveNow = Boolean(ad.capabilities?.canApprove || ad.id === "codex" || ad.id === "workbuddy");
				const isObserveAdapter = ad.capabilities?.canPrompt === false || ad.id === "doubao";
				const statusTag = !ad.installed && !ad.hasBinary ? "⚪ 未安装" : isObserveAdapter ? "👀 仅观测" : ad.hasBinary ? canApproveNow ? "✅ 远控+审批" : "🔵 看会话/发指令" : "👀 观察模式";
				return `
                          <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">
                            ${renderHarnessBadgeHtml(ad.id, "inline")} ${esc$1(ad.label || ad.id)} · ${statusTag}
                          </span>
                        `;
			}).join("")}
                      </div>

                      <div style="font-size:11.5px;color:var(--muted);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                        <span>🔒 指纹 <code>${esc$1(shortFp)}</code> · ${h.hasDedicatedToken ? `🔑 独立凭证 (${esc$1(h.hostTokenPreview)})` : "🔑 管理员凭证"}</span>
                        <span>${h.syncMeta?.seq ? `同步序号 #${h.syncMeta.seq}` : ""}</span>
                      </div>

                      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;padding-top:4px;">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button class="pill-action-btn ${h.isFeishuActive ? "primary" : ""}" style="padding:5px 10px;font-size:11.5px;" onclick="activateFeishuHost('${esc$1(h.hostId)}')">
                            ${h.isFeishuActive ? "🎯 飞书当前主控" : "切飞书到这台"}
                          </button>
                          <button class="pill-action-btn ${h.remoteActive ? "primary" : ""}" style="padding:5px 10px;font-size:11.5px;" onclick="toggleHostRemoteMode('${esc$1(h.hostId)}', ${!h.remoteActive})">
                            ${h.remoteActive ? "🔔 飞书通知: 开" : "🔕 飞书通知: 关"}
                          </button>
                          <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;" onclick="openTurboGuideSheet()">
                            ${h.bridgeState?.turbo?.enabled ? "⚡ 极速详情" : "🚀 一键提速"}
                          </button>
                          <button class="pill-action-btn ${isHostOutdated ? "primary" : ""}" style="padding:5px 10px;font-size:11.5px;" onclick="upgradeHostTurbo('${esc$1(h.hostId)}', '${esc$1(h.hostName)}')" ${isUpgradingHost ? "disabled" : ""}>
                            ${isUpgradingHost ? "⏳ 正在升级重启..." : isHostOutdated ? `🔄 一键升级 (v${esc$1(hubVer)})` : "🔄 检查/重装更新"}
                          </button>
                        </div>
                        <div>
                          ${isRevoked ? `
                            <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;" onclick="unrevokeHostCredential('${esc$1(h.hostId)}', '${esc$1(h.hostName)}')">恢复接入</button>
                          ` : `
                            <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;color:var(--red);" onclick="revokeHostCredential('${esc$1(h.hostId)}', '${esc$1(h.hostName)}')">🚫 吊销凭证</button>
                          `}
                        </div>
                      </div>
                    </div>
                  ` : ""}
                </div>
              `;
		}).join("") || `<div style="padding:24px;text-align:center;color:var(--muted);">暂未检测到在线电脑，请复制上方「添加电脑」命令在终端执行</div>`}
            </div>
          </div>

          <div>
            <div class="settings-group-title">各后端功能边界（诚实矩阵）</div>
            <div class="settings-card" style="padding:12px 14px;overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border);color:var(--muted);">
                    <th style="text-align:left;padding:6px 4px;">后端</th>
                    <th style="padding:6px 3px;">看会话</th>
                    <th style="padding:6px 3px;">发指令</th>
                    <th style="padding:6px 3px;">停止</th>
                    <th style="padding:6px 3px;">手机审批</th>
                    <th style="padding:6px 3px;">实时插话</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderCapabilityMatrixRowsHtml()}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div class="settings-group-title">外观与显示模式</div>
            <div class="settings-card">
              <div class="settings-item" style="gap:8px;">
                <div style="min-width:0;flex:1;">
                  <div class="settings-item-title" style="white-space:nowrap;">界面语言 / Language</div>
                  <div class="settings-item-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">自动识别浏览器语言或手动切换</div>
                </div>
                <div class="theme-seg-group">
                  <button class="theme-seg-btn ${langPref === "zh" ? "active" : ""}" onclick="setLangPreference('zh')">🇨🇳 中文</button>
                  <button class="theme-seg-btn ${langPref === "en" ? "active" : ""}" onclick="setLangPreference('en')">🇺🇸 English</button>
                </div>
              </div>
              <div class="settings-item" style="gap:8px;">
                <div style="min-width:0;flex:1;">
                  <div class="settings-item-title" style="white-space:nowrap;">深色 / 浅色主题</div>
                  <div class="settings-item-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">自动或手动切换外观</div>
                </div>
                <div class="theme-seg-group">
                  <button class="theme-seg-btn ${themePref === "system" ? "active" : ""}" onclick="setThemePreference('system')">跟随系统</button>
                  <button class="theme-seg-btn ${themePref === "light" ? "active" : ""}" onclick="setThemePreference('light')">☀️ 浅色</button>
                  <button class="theme-seg-btn ${themePref === "dark" ? "active" : ""}" onclick="setThemePreference('dark')">🌙 深色</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-group-title">多电脑协同与一键迁移</div>
            <div class="settings-card">
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">跨电脑一键迁移会话</div>
                  <div class="settings-item-desc">将源电脑 ~/.dsh 会话打包同步至目标电脑并可选清理源机</div>
                </div>
                <button class="pill-action-btn primary" onclick="openMigrateWizard()">📦 打开迁移向导</button>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-group-title">端到端加密分享记录 (${shares.length})</div>
            <div class="settings-card">
              ${latestShareResults.map((item) => `
                <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="settings-item-title">🔐 最近生成（来自 ${esc$1(item.hostName)}）</div>
                    <span style="font-size:11.5px;color:var(--muted);">${formatTime(item.at)}</span>
                  </div>
                  <div style="font-size:11.5px;color:var(--muted);font-family:var(--mono);word-break:break-all;background:var(--subtle);padding:6px 8px;border-radius:8px;">
                    ${esc$1(item.fullUrl)}
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button class="pill-action-btn primary" onclick="copyCodeText('${encodeURIComponent(item.fullUrl)}', '🔗 加密分享链接已复制')">📋 复制完整解密链接</button>
                    <a href="${esc$1(item.fullUrl)}" target="_blank" rel="noopener" class="pill-action-btn" style="text-decoration:none;display:inline-flex;align-items:center;">🌐 打开</a>
                  </div>
                </div>
              `).join("")}
              ${shares.length ? shares.slice(0, 8).map((s) => `
                <div class="settings-item">
                  <div>
                    <div class="settings-item-title">${esc$1(s.title || "加密会话回放")}</div>
                    <div class="settings-item-desc">来自 ${esc$1(s.hostName || s.hostId || "远端电脑")} · ${formatTime(s.createdAt)} · ${formatBytes(s.sizeBytes || 0)}</div>
                  </div>
                  <button class="pill-action-btn" style="color:var(--red);" onclick="deleteShareRecord('${esc$1(s.id || s.shareId)}')">🗑️ 销毁</button>
                </div>
              `).join("") : `
                <div class="settings-item">
                  <div class="settings-item-desc">暂无加密分享记录。可在任意会话右上角「⋯ → 生成 AES-256 端到端加密回放链接」创建。</div>
                </div>
              `}
            </div>
          </div>

          <div>
            <div class="settings-group-title">手机锁屏通知 (iOS 16.4+ Web Push)</div>
            <div class="settings-card">
              <div class="settings-item" style="display:block;">
                <div class="settings-item-title">启用 iPhone 锁屏实时推送</div>
                <div class="settings-item-desc">当任意电脑有待审批、任务完成或异常时直接弹窗</div>
                <div id="pushLocalStatus" style="margin-top:9px;font-size:12.5px;font-weight:600;color:${esc$1(cachedPushStatusColor || "var(--primary)")};">
                  ${esc$1(cachedPushStatusText || "正在检测本机推送状态…")}
                </div>
                <div id="pushDeviceList" style="margin-top:4px;font-size:12px;color:var(--muted);line-height:1.55;">${esc$1(cachedPushDeviceListText || "")}</div>
                <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                  <button class="pill-action-btn primary" onclick="subscribeIphonePush()">📲 开启推送</button>
                  <button class="pill-action-btn" onclick="sendTestPush()">🔔 测试</button>
                  <button class="pill-action-btn" style="color:var(--red);" onclick="disableIphonePush()">关闭本机推送</button>
                </div>
                <div class="settings-item-desc" style="margin-top:8px;">
                  iPhone 需先在 Safari「分享 → 添加到主屏幕」，再从桌面图标打开本页开启，才能收到锁屏通知
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-group-title">隐私与访问密码保护</div>
            <div class="settings-card">
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">添加新手机（6 位免密配对码）</div>
                  <div class="settings-item-desc">生成 3 分钟有效的一次性 6 位字母/数字配对码，新手机免输长密码直接解锁</div>
                </div>
                <button class="pill-action-btn primary" onclick="openPairingCodeSheet()">📱 生成配对码</button>
              </div>
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">修改总控台访问密码</div>
                  <div class="settings-item-desc">随时更换访问密钥，防止未授权访问</div>
                </div>
                <button class="pill-action-btn" onclick="promptChangePassword()">🔑 修改密码</button>
              </div>
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">锁定当前浏览器</div>
                  <div class="settings-item-desc">清除本机浏览器缓存的登录凭证</div>
                </div>
                <button class="pill-action-btn" style="color:var(--red);" onclick="lockAndLogout()">🔒 立即锁定</button>
              </div>
            </div>
          </div>

          <div style="text-align:center;padding:8px 12px 20px;">
            <div style="margin-bottom:10px;">
              <button
                type="button"
                class="pill-action-btn"
                style="font-size:12px;padding:6px 14px;"
                onclick="forceHardUpgradeReload()"
              >
                🔄 强制刷新前端版本（清缓存重载）
              </button>
            </div>
            <div
              style="font-size:11.5px;color:var(--muted);cursor:pointer;user-select:none;"
              onclick="copyCodeText('${encodeURIComponent(`DSH Hub v${buildInfo.version || "0.2.0"} (${buildInfo.uiBuild || "dev"}) · started ${buildInfo.startedAt ? new Date(buildInfo.startedAt).toISOString() : ""}`)}', '📋 版本信息已复制')"
            >
              DSH 远控总控台 v${esc$1(buildInfo.version || "0.2.0")} · 构建 <code>${esc$1(buildInfo.uiBuild || "dev")}</code>${buildInfo.startedAt ? " · 云端启动于 " + formatTime(buildInfo.startedAt) : ""}
            </div>
          </div>
        </div>
      `;
		if (prevScrollTop > 0) viewport.scrollTop = prevScrollTop;
		refreshPushStatus();
	}
	function getSubServerKeyBase64Url(sub) {
		try {
			const buf = sub?.options?.applicationServerKey;
			if (!buf) return "";
			const bytes = new Uint8Array(buf);
			let bin = "";
			for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		} catch {
			return "";
		}
	}
	let pushAutoSyncInFlight = false;
	async function ensureLocalPushSubscriptionSynced({ forceResubscribe = false } = {}) {
		if (pushAutoSyncInFlight) return null;
		if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return null;
		if (Notification.permission !== "granted") return null;
		pushAutoSyncInFlight = true;
		try {
			await navigator.serviceWorker.register("/sw.js");
			const reg = await navigator.serviceWorker.ready;
			let sub = await reg.pushManager.getSubscription().catch(() => null);
			let expectedKey = hubState.vapidPublicKey || "";
			if (!expectedKey) expectedKey = (await (await apiFetch("/api/push/vapid-public-key")).json().catch(() => ({})))?.publicKey || "";
			const localKey = sub ? getSubServerKeyBase64Url(sub) : "";
			const keyMismatch = Boolean(sub && expectedKey && localKey && localKey !== expectedKey);
			const serverEmpty = (hubState.pushSubscriptions || []).length === 0;
			if (forceResubscribe || keyMismatch || !sub && forceResubscribe) {
				if (sub) await sub.unsubscribe().catch(() => {});
				if (expectedKey) sub = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(expectedKey)
				});
			}
			if (sub && (forceResubscribe || keyMismatch || serverEmpty)) await apiFetch("/api/push/subscribe", {
				method: "POST",
				body: JSON.stringify({
					subscription: sub,
					deviceName: isIosDevice() ? "iPhone 主屏幕 App" : "浏览器 Web Push"
				})
			});
			return sub;
		} catch {
			return null;
		} finally {
			pushAutoSyncInFlight = false;
		}
	}
	let lastPushStatusAt = 0;
	async function refreshPushStatus(manual = false) {
		const statusEl = document.getElementById("pushLocalStatus");
		const listEl = document.getElementById("pushDeviceList");
		if (!statusEl) return;
		const subs = hubState.pushSubscriptions || [];
		if (listEl) {
			if (!subs.length) cachedPushDeviceListText = "还没有设备登记推送";
			else {
				const devices = subs.slice(0, 5).map((sub) => {
					return `${sub.deviceName || "未知设备"}${sub.endpointHost ? ` · ${sub.endpointHost}` : ""}`;
				});
				const more = subs.length > 5 ? ` 等 ${subs.length} 台` : "";
				cachedPushDeviceListText = `已在服务端登记 ${subs.length} 台设备：${devices.join("；")}${more}`;
			}
			listEl.textContent = cachedPushDeviceListText;
		}
		if (!manual && cachedPushStatusText && Date.now() - lastPushStatusAt < 1e4) {
			statusEl.textContent = cachedPushStatusText;
			if (cachedPushStatusColor) statusEl.style.color = cachedPushStatusColor;
			if (langPref === "en") applyLangToDom(document.body, langPref);
			return;
		}
		lastPushStatusAt = Date.now();
		if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
			cachedPushStatusText = "本机：当前浏览器不支持锁屏推送（iPhone 需从主屏幕 App 打开）";
			cachedPushStatusColor = "#d97706";
			statusEl.textContent = cachedPushStatusText;
			statusEl.style.color = cachedPushStatusColor;
			if (langPref === "en") applyLangToDom(document.body, langPref);
			return;
		}
		try {
			const reg = await navigator.serviceWorker.getRegistration();
			let sub = reg ? await reg.pushManager.getSubscription() : null;
			const permission = Notification.permission;
			if (sub && permission === "granted") {
				const localKey = getSubServerKeyBase64Url(sub);
				const expectedKey = hubState.vapidPublicKey || "";
				if ((expectedKey && localKey && localKey !== expectedKey || !subs.length) && Date.now() - lastAutoPushSyncAt > 6e4) {
					lastAutoPushSyncAt = Date.now();
					const synced = await ensureLocalPushSubscriptionSynced();
					if (synced) sub = synced;
				}
				cachedPushStatusText = "本机：✅ 已开启锁屏推送";
				cachedPushStatusColor = "#059669";
			} else if (sub && permission === "denied") {
				cachedPushStatusText = "本机：已订阅但通知权限被拒绝，请到「设置 → 通知」中允许";
				cachedPushStatusColor = "#dc2626";
			} else if (permission === "denied") {
				cachedPushStatusText = "本机：通知权限被拒绝，请到「设置 → 通知 → DSH 远控」中允许";
				cachedPushStatusColor = "#dc2626";
			} else {
				cachedPushStatusText = "本机：未开启（点下方「开启推送」）";
				cachedPushStatusColor = "#d97706";
			}
			statusEl.textContent = cachedPushStatusText;
			statusEl.style.color = cachedPushStatusColor;
			if (langPref === "en") applyLangToDom(document.body, langPref);
			if (manual) showToast("已刷新推送状态");
		} catch (err) {
			cachedPushStatusText = "本机：状态读取失败（" + (err && err.message || err) + "）";
			cachedPushStatusColor = "#dc2626";
			statusEl.textContent = cachedPushStatusText;
			statusEl.style.color = cachedPushStatusColor;
			if (langPref === "en") applyLangToDom(document.body, langPref);
		}
	}
	async function disableIphonePush() {
		try {
			const reg = await navigator.serviceWorker.getRegistration();
			const sub = reg ? await reg.pushManager.getSubscription() : null;
			if (!sub) {
				showToast("本机当前没有开启推送");
				refreshPushStatus();
				return;
			}
			const endpoint = sub.endpoint;
			await sub.unsubscribe();
			try {
				await apiFetch("/api/push/unsubscribe", {
					method: "POST",
					body: JSON.stringify({ endpoint })
				});
			} catch {}
			showToast("🔕 已关闭本机推送");
			setTimeout(fetchState, 300);
			refreshPushStatus(true);
		} catch (err) {
			showToast("❌ 关闭失败：" + (err && err.message || err));
		}
	}
	async function activateFeishuHost(hostId) {
		await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/activate`, { method: "POST" });
		showToast("🎯 已切换飞书主控电脑");
		setTimeout(fetchState, 400);
	}
	async function toggleHostRemoteMode(hostId, enable) {
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		if (host && host.online === false) {
			showToast("❌ 该电脑当前离线，无法切换通知");
			return;
		}
		try {
			const res = await dispatchHostCommand(hostId, {
				type: "remote_mode",
				active: enable
			});
			if (res && res.ok === false) {
				showToast("❌ " + (res.error || "切换失败"));
				return;
			}
			if (host) host.remoteActive = enable;
			renderSettingsTab();
			showToast(enable ? "🔔 已开启飞书通知（2 小时无操作会自动关闭）" : "🔕 已关闭飞书通知");
			setTimeout(fetchState, 2500);
		} catch (err) {
			showToast("❌ 切换失败: " + (err.message || err));
		}
	}
	async function promptChangePassword() {
		const next = prompt("请输入新的总控台访问密码（至少 6 位）：");
		if (!next || next.trim().length < 6) return;
		const clean = next.trim();
		const data = await (await apiFetch("/api/auth/change-token", {
			method: "POST",
			body: JSON.stringify({ newToken: clean })
		})).json();
		if (data.ok) {
			localStorage.setItem("dsh_hub_token", clean);
			showToast("✅ 访问密码已更新！请同步更新各电脑 ~/.dsh/feishu.env");
			renderSettingsTab();
		} else showToast("❌ " + (data.error || "修改失败"));
	}
	function openMigrateWizard() {
		const hosts = hubState.hosts || [];
		if (hosts.length < 2) {
			showToast("需要至少 2 台已接入的电脑才能互相迁移");
			return;
		}
		migSource = hosts[0].hostId;
		migTarget = hosts[1].hostId;
		renderMigrateWizard();
		openSheet("mobileSettingsSheet");
	}
	function renderMigrateWizard() {
		const hosts = hubState.hosts || [];
		const srcObj = hosts.find((h) => h.hostId === migSource) || hosts[0];
		const dstObj = hosts.find((h) => h.hostId === migTarget) || hosts[1] || hosts[0];
		const body = document.getElementById("migrateWizardBody");
		body.innerHTML = `
        <div class="form-label">1. 选择迁移方向</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--subtle);border:1px solid var(--border);text-align:center;font-weight:700;font-size:14px;color:var(--text);">
            💻 ${esc$1(srcObj?.hostName || migSource)}
            <div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:2px;">源电脑</div>
          </div>
          <button class="pill-action-btn" onclick="swapMigrateHosts()">⇄ 互换</button>
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--border);text-align:center;font-weight:700;font-size:14px;color:var(--primary);">
            💻 ${esc$1(dstObj?.hostName || migTarget)}
            <div style="font-size:11px;color:var(--primary);font-weight:400;margin-top:2px;">目标电脑</div>
          </div>
        </div>

        <div class="form-label">2. 迁移选项</div>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 0;font-size:14px;cursor:pointer;">
          <input type="checkbox" checked onchange="migSwitchFeishu=this.checked" />
          <span>迁移完成后自动把飞书机器人切到目标电脑</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 0;font-size:14px;cursor:pointer;">
          <input type="checkbox"  onchange="migWipeSource=this.checked" />
          <span>迁移后清空源电脑上的会话历史（保留飞书凭证）</span>
        </label>

        <button class="primary-block-btn" onclick="submitRealMigration()">🚀 开始一键加密迁移</button>
      `;
	}
	function swapMigrateHosts() {
		const tmp = migSource;
		migSource = migTarget;
		migTarget = tmp;
		renderMigrateWizard();
	}
	async function submitRealMigration() {
		closeSheet("mobileSettingsSheet");
		showToast("📦 已启动跨电脑加密迁移任务...");
		await apiFetch("/api/migrate", {
			method: "POST",
			body: JSON.stringify({
				sourceHostId: migSource,
				targetHostId: migTarget,
				switchFeishu: migSwitchFeishu,
				wipeSource: migWipeSource
			})
		});
		setTimeout(fetchState, 1e3);
	}
	async function subscribeIphonePush() {
		if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
			showToast("当前浏览器不支持 Web Push：iPhone 请用 Safari「添加到主屏幕」后从桌面图标打开");
			return;
		}
		if (isIosDevice() && !isStandaloneApp()) {
			showToast("请先用 Safari「分享 → 添加到主屏幕」，再从桌面图标打开本页开启推送");
			return;
		}
		try {
			let perm = Notification.permission;
			if (perm !== "granted" && typeof Notification.requestPermission === "function") perm = await Notification.requestPermission();
			if (perm !== "granted") {
				showToast(perm === "denied" ? "通知权限已被拒绝：请到 iPhone「设置 → 通知 → DSH 远控」中改为允许" : "未获得通知权限，请重试并在弹窗中点「允许」");
				return;
			}
			await navigator.serviceWorker.register("/sw.js");
			const reg = await navigator.serviceWorker.ready;
			const oldSub = await reg.pushManager.getSubscription().catch(() => null);
			if (oldSub) await oldSub.unsubscribe().catch(() => {});
			const keyRes = await (await apiFetch("/api/push/vapid-public-key")).json();
			if (!keyRes || !keyRes.publicKey) throw new Error("服务器未返回 VAPID 公钥");
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
			});
			const res = await apiFetch("/api/push/subscribe", {
				method: "POST",
				body: JSON.stringify({
					subscription: sub,
					deviceName: isIosDevice() ? "iPhone 主屏幕 App" : "浏览器 Web Push"
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data.ok === false) throw new Error(data.error || "订阅上报失败 (HTTP " + res.status + ")");
			showToast("📲 已成功开启 iPhone 锁屏推送！");
			refreshPushStatus(true);
			setTimeout(fetchState, 300);
		} catch (err) {
			const detail = (err && err.name ? err.name + ": " : "") + (err && err.message || err);
			console.warn("[DSH push] 开启失败", err);
			let hint = "";
			if (/push service|Registration failed|AbortError|network|Failed to fetch/i.test(detail)) hint = "（连不上推送服务：桌面 Chrome 需能访问 Google FCM，iPhone 请从主屏幕 App 打开）";
			showToast("❌ 开启失败: " + detail + hint);
		}
	}
	async function sendTestPush() {
		try {
			await ensureLocalPushSubscriptionSynced();
			let res = await apiFetch("/api/push/test", {
				method: "POST",
				body: JSON.stringify({})
			});
			let data = await res.json().catch(() => ({}));
			let total = Number(data.totalSubscriptions || 0);
			let sent = Number(data.sentCount || 0);
			const firstFail = (data.results || []).find((r) => r && r.ok === false);
			if ((!total || !sent && firstFail && /VapidPkHashMismatch|403|410|404/i.test(String(firstFail.error || firstFail.status || ""))) && typeof Notification !== "undefined" && Notification.permission === "granted") {
				if (await ensureLocalPushSubscriptionSynced({ forceResubscribe: true })) {
					res = await apiFetch("/api/push/test", {
						method: "POST",
						body: JSON.stringify({})
					});
					data = await res.json().catch(() => ({}));
					total = Number(data.totalSubscriptions || 0);
					sent = Number(data.sentCount || 0);
				}
			}
			if (!total) {
				showToast("⚠️ 还没有设备订阅推送，请先点「开启推送」");
				return;
			}
			if (!sent) {
				const failed = (data.results || []).find((r) => r && r.ok === false);
				showToast("⚠️ 测试推送未送达：" + (failed && (failed.error || "HTTP " + failed.status) || "推送服务返回失败"));
				return;
			}
			showToast(`🔔 已发送测试锁屏通知（${sent}/${total} 台设备）`);
			setTimeout(fetchState, 300);
		} catch (err) {
			showToast("❌ 发送失败: " + (err && err.message || err));
		}
	}
	function openHostSheet() {
		const hosts = hubState.hosts || [];
		const totalCount = hosts.reduce((acc, h) => acc + (h.bridgeState?.tasks || []).length, 0);
		const onlineCount = hosts.filter((h) => h.online).length;
		document.getElementById("hostSheetCountLabel").textContent = `${onlineCount}/${hosts.length} 台设备在线`;
		const list = document.getElementById("hostOptionList");
		list.innerHTML = [`<div class="host-option ${currentHostId === "ALL_HOSTS" ? "selected" : ""}" onclick="selectHost('ALL_HOSTS')">
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--text);">🌐 全部电脑汇总</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">一屏混排查看 ${hosts.length} 台电脑共 ${totalCount} 条会话</div>
          </div>
          <span style="font-size:13px;font-weight:600;color:var(--primary);">${currentHostId === "ALL_HOSTS" ? "当前视图 ✓" : "切换 ›"}</span>
        </div>`, ...hosts.map((h) => `
          <div class="host-option ${h.hostId === currentHostId ? "selected" : ""}" onclick="selectHost('${esc$1(h.hostId)}')">
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text);">${h.online ? "🟢" : "⚪"} ${esc$1(h.hostName)}</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">${(h.bridgeState?.tasks || []).length} 条会话 · ${h.isFeishuActive ? "🎯 飞书当前主控" : h.online ? "在线待命" : "离线 (" + formatTime(h.lastSeen) + ")"}</div>
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--primary);">${h.hostId === currentHostId ? "当前设备 ✓" : "切换 ›"}</span>
          </div>
        `)].join("");
		openSheet("hostSheet");
	}
	function selectHost(id) {
		currentHostId = id;
		currentProject = "ALL";
		fileProjectCwd = "";
		closeSheet("hostSheet");
		renderAll();
	}
	function selectProject(proj) {
		currentProject = proj;
		renderAll();
	}
	function switchTab(tab) {
		currentTab = tab;
		document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
		document.getElementById("tab-" + tab).classList.add("active");
		if (tab === "files") {
			const hosts = hubState.hosts || [];
			const host = currentHostId === "ALL_HOSTS" ? hosts[0] : hosts.find((h) => h.hostId === currentHostId);
			if (host && !host.lastFsListing) {
				const projs = getHostProjects(host);
				const firstTask = (host.bridgeState?.tasks || [])[0];
				if (projs[0]) requestDirList(host.hostId, firstTask?.id || "", projs[0].cwd, "");
			}
		}
		renderAll();
	}
	function closeSheet(id) {
		dismissOverlay("sheet:" + id, () => rawCloseSheet(id));
	}
	function onSearchInput() {
		searchQuery = document.getElementById("searchInput").value;
		document.getElementById("searchClearBtn").style.display = searchQuery ? "inline-flex" : "none";
		renderSessionList();
	}
	function clearSearch() {
		const input = document.getElementById("searchInput");
		input.value = "";
		searchQuery = "";
		document.getElementById("searchClearBtn").style.display = "none";
		renderSessionList();
	}
	async function copyText(text, { successMessage = "📋 已复制到剪贴板", title = "📋 复制内容" } = {}) {
		const value = String(text ?? "");
		if (!value) return false;
		try {
			if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
				await navigator.clipboard.writeText(value);
				showToast(successMessage);
				return true;
			}
		} catch {}
		try {
			const ta = document.createElement("textarea");
			ta.value = value;
			ta.setAttribute("readonly", "readonly");
			ta.style.position = "fixed";
			ta.style.top = "-9999px";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.focus();
			ta.select();
			ta.setSelectionRange(0, value.length);
			const ok = document.execCommand("copy");
			document.body.removeChild(ta);
			if (ok) {
				showToast(successMessage);
				return true;
			}
		} catch {}
		openCopyFallbackSheet(value, title);
		return false;
	}
	function openCopyFallbackSheet(text, title = "📋 复制内容") {
		const titleEl = document.getElementById("copyFallbackTitle");
		if (titleEl) titleEl.textContent = title;
		const ta = document.getElementById("copyFallbackTextarea");
		if (ta) ta.value = String(text ?? "");
		openSheet("copyFallbackSheet");
		setTimeout(() => {
			try {
				ta?.focus();
				ta?.select();
			} catch {}
		}, 80);
	}
	async function retryCopyFromFallbackSheet() {
		const ta = document.getElementById("copyFallbackTextarea");
		const val = ta ? ta.value : "";
		if (!val) return;
		try {
			ta.focus();
			ta.select();
			ta.setSelectionRange(0, val.length);
		} catch {}
		if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") try {
			await navigator.clipboard.writeText(val);
			closeSheet("copyFallbackSheet");
			showToast("📋 已复制到剪贴板");
			return;
		} catch {}
		try {
			if (document.execCommand("copy")) {
				closeSheet("copyFallbackSheet");
				showToast("📋 已复制到剪贴板");
				return;
			}
		} catch {}
		showToast("请长按上方选中文本并点「拷贝」");
	}
	function copyCodeText(encoded, successMessage = "📋 已复制到剪贴板") {
		copyText(decodeURIComponent(encoded), { successMessage });
	}
	function openTurboGuideSheet() {
		const hosts = hubState.hosts || [];
		const enrollCode = hubState.enrollment?.code || "配对码";
		const body = document.getElementById("turboGuideBody");
		const oneStepCmd = `curl -fsSL ${location.origin}/install.sh | bash -s -- --code ${enrollCode}`;
		body.innerHTML = `
        <div style="background:var(--green-soft);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--text);line-height:1.5;">
          <strong>🦀 Rust 原生极速引擎 + 双向 SSE 实时流 (dsh-turbo)</strong><br/>
          对 DeepSeek Harness / Antigravity IDE / Codex 本体 <strong>100% 零改动</strong>，通过只读监听日志文件末尾字节与 macOS 原生 CGEvent 按键注入，将延迟从 3~10 秒压至 <strong>&lt;200ms</strong>。
        </div>

        <div class="form-label">1. 已连接电脑极速引擎与权限状态</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
          ${hosts.map((h) => {
			const tb = h.bridgeState?.turbo;
			const isTurbo = Boolean(tb?.enabled);
			const axOk = tb ? tb.accessibilityGranted !== false : false;
			return `
              <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--subtle);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <strong style="font-size:14px;color:var(--text);">${h.online ? "🟢" : "⚪"} ${esc$1(h.hostName)}</strong>
                  <span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:${isTurbo ? "var(--green-soft)" : "var(--amber-soft)"};color:${isTurbo ? "var(--green)" : "var(--amber)"};">
                    ${esc$1(tb?.engineLabel || "🐢 标准轮询模式")}
                  </span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
                  辅助功能遥控权限：${axOk ? "<span style=\"color:var(--green);font-weight:600;\">✅ 已授权 (支持 1ms 审批点击)</span>" : "<span style=\"color:var(--amber);font-weight:600;\">⚠️ 待开启或待升级</span>"}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="pill-action-btn primary" style="font-size:12px;padding:5px 11px;" onclick="upgradeHostTurbo('${esc$1(h.hostId)}')">
                    🚀 远程一键升级/刷新极速引擎
                  </button>
                  <button class="pill-action-btn" style="font-size:12px;padding:5px 11px;" onclick="requestHostAxPermission('${esc$1(h.hostId)}')">
                    🔓 在电脑弹出辅助功能授权框
                  </button>
                </div>
              </div>
            `;
		}).join("") || `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px;">暂未检测到已接入的电脑</div>`}
        </div>

        <div class="form-label">2. 如何让手机遥控最流畅最快（3 步指南）</div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:var(--text-secondary);line-height:1.55;margin-bottom:14px;">
          <div style="padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>① 一步命令接入（自动启用 Rust 加速 + 免二次安装）</strong><br/>
            新电脑只需运行一次 <code>./connect-host.sh</code>，脚本会自动寻找系统或 IDE 内置运行时、挂载 <code>dsh-turbo</code> 预编译 Rust 加速模块，并自动弹出 macOS 辅助功能授权框。<br/>
            <button class="pill-action-btn" style="margin-top:6px;font-size:11.5px;padding:4px 10px;" onclick="copyCodeText('${encodeURIComponent(oneStepCmd)}')">📋 复制一键满血接入命令</button>
          </div>
          <div style="padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>② 勾选 macOS「辅助功能」权限</strong><br/>
            若手机点审批时电脑未自动按下回车，点上方「🔓 在电脑弹出辅助功能授权框」，在电脑弹出的「系统设置 → 隐私与安全性 → 辅助功能」中打开开关即可。
          </div>
          <div style="padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>③ iPhone Safari 添加到主屏幕 + 开启锁屏推送</strong><br/>
            在 Safari 点底部「分享 → 添加到主屏幕」，从桌面独立图标打开并开启锁屏推送，获得原生 App 级全屏帧率与锁屏秒级提醒。
          </div>
        </div>
      `;
		openSheet("turboGuideSheet");
	}
	async function requestHostAxPermission(hostId) {
		showToast("🔓 正在电脑端弹出 macOS 辅助功能授权窗口...");
		await dispatchHostCommand(hostId, { type: "request_ax_permission" });
		setTimeout(fetchState, 400);
		setTimeout(() => {
			if (document.getElementById("turboGuideSheet").classList.contains("open")) openTurboGuideSheet();
		}, 900);
	}
	async function upgradeHostTurbo(hostId, hostName = "") {
		const label = hostName || hostId;
		upgradingHostMap[hostId] = Date.now();
		lastRenderedSettingsKey = "";
		if (currentTab === "settings") renderSettingsTab();
		showToast(`🚀 正在为「${label}」拉取最新代码并自动热重启守护进程...`);
		try {
			await dispatchHostCommand(hostId, { type: "upgrade_turbo" });
		} catch {}
		const startWait = Date.now();
		const pollUpgrade = async () => {
			await fetchState({
				silent: true,
				forceFresh: true
			});
			const targetVer = String(hubState.build?.version || hubState.version || "0.5.1").trim();
			const updatedHost = (hubState.hosts || []).find((h) => h.hostId === hostId);
			const curVer = String(updatedHost?.bridgeState?.agentVersion || "").trim();
			if (curVer && compareSemver(curVer, targetVer) >= 0) {
				delete upgradingHostMap[hostId];
				lastRenderedSettingsKey = "";
				if (currentTab === "settings") renderSettingsTab();
				if (document.getElementById("turboGuideSheet")?.classList.contains("open")) openTurboGuideSheet();
				showToast(`✅ 电脑「${label}」已升级至最新版本 v${targetVer}！`);
				return;
			}
			if (Date.now() - startWait < 45e3) setTimeout(pollUpgrade, 1500);
			else {
				delete upgradingHostMap[hostId];
				lastRenderedSettingsKey = "";
				if (currentTab === "settings") renderSettingsTab();
				if (document.getElementById("turboGuideSheet")?.classList.contains("open")) openTurboGuideSheet();
			}
		};
		setTimeout(pollUpgrade, 2e3);
	}
	let lastSheetDragEndAt = 0;
	function setFileSheetExpanded(expanded) {
		const panel = document.querySelector("#inChatFileSheet .sheet-panel");
		if (!panel) return;
		const isExp = Boolean(expanded);
		panel.classList.toggle("sheet-expanded", isExp);
		const btn = document.getElementById("inChatFileExpandBtn");
		if (btn) {
			btn.textContent = isExp ? "⤡" : "⤢";
			const rawLabel = isExp ? "收起高度" : "展开显示更多";
			const label = langPref === "en" ? translateZhStringToEn(rawLabel) : rawLabel;
			btn.title = label;
			btn.setAttribute("aria-label", label);
		}
	}
	function toggleFileSheetExpanded() {
		if (Date.now() - lastSheetDragEndAt < 260) return;
		const panel = document.querySelector("#inChatFileSheet .sheet-panel");
		if (!panel) return;
		setFileSheetExpanded(!panel.classList.contains("sheet-expanded"));
	}
	function rawCloseSheet(id) {
		if (id === "newTaskSheet") stopVoiceInput();
		document.getElementById(id)?.classList.remove("open");
		if (id === "inChatFileSheet") {
			document.body.classList.remove("mobile-file-open");
			drawerChangedFilesSessionId = null;
			setFileSheetExpanded(false);
		}
	}
	function trackOverlay(kind, closeFn) {
		if (overlayStack.some((item) => item.kind === kind)) return;
		overlayStack.push({
			kind,
			closeFn
		});
		try {
			history.pushState({
				__dshOverlay: kind,
				__dshDepth: overlayStack.length
			}, "");
		} catch {}
	}
	function openSheet(id) {
		const el = document.getElementById(id);
		if (!el) return;
		el.classList.add("open");
		applyLangToDom(el, langPref);
		trackOverlay("sheet:" + id, () => rawCloseSheet(id));
	}
	function dismissOverlay(kind, fallbackClose) {
		const index = overlayStack.map((item) => item.kind).lastIndexOf(kind);
		const entry = index >= 0 ? overlayStack.splice(index, 1)[0] : null;
		if (entry) entry.closeFn();
		else if (typeof fallbackClose === "function") fallbackClose();
		if (entry && history.state && history.state.__dshOverlay) {
			suppressPopstateCount += 1;
			try {
				history.back();
			} catch {
				suppressPopstateCount = Math.max(0, suppressPopstateCount - 1);
			}
		}
	}
	window.addEventListener("popstate", () => {
		if (suppressPopstateCount > 0) {
			suppressPopstateCount -= 1;
			return;
		}
		const state = history.state || null;
		const targetDepth = state && typeof state.__dshDepth === "number" ? state.__dshDepth : 0;
		while (overlayStack.length > targetDepth) {
			const entry = overlayStack.pop();
			if (entry) entry.closeFn();
		}
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || overlayStack.length === 0) return;
		const tag = document.activeElement && document.activeElement.tagName || "";
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
		event.preventDefault();
		const top = overlayStack[overlayStack.length - 1];
		dismissOverlay(top.kind, top.closeFn);
	});
	function setupChatSwipeBack() {
		const chat = document.getElementById("chatFullscreen");
		if (!chat) return;
		let tracking = false;
		let decided = null;
		let swipeDir = 0;
		let startX = 0;
		let startY = 0;
		let startRelX = 0;
		let lastX = 0;
		let lastY = 0;
		let startedAt = 0;
		let width = 0;
		let originTarget = null;
		let lastHandledMoveEvt = null;
		let lastHandledEndEvt = null;
		const resetChatStyle = () => {
			chat.style.transition = "";
			chat.style.transform = "";
			chat.style.willChange = "";
			chat.style.boxShadow = "";
		};
		const flushDeferredChatRender = () => {
			chatTouchDownAt = 0;
			if (pendingChatRenderAfterTouch && activeSessionId) {
				pendingChatRenderAfterTouch = false;
				renderActiveChatStage();
			}
		};
		const isInteractiveSwipeExcluded = (target) => {
			if (!target || typeof target.closest !== "function") return false;
			return Boolean(target.closest("textarea, input, select, video, audio, #wechatHoldTalkBtn, #wechatHoldBtn, #wechatVoiceOverlay, [data-no-back-swipe]"));
		};
		const canScrollHorizontally = (target, dx) => {
			if (startRelX <= 36 || startRelX >= width - 36) return false;
			let node = target;
			while (node && node !== chat && node.id !== "chatMessages" && node.nodeType === 1) {
				const overflowX = window.getComputedStyle(node).overflowX;
				if (/(auto|scroll)/.test(overflowX) && node.scrollWidth > node.clientWidth + 8) {
					if (dx > 0 && node.scrollLeft > 2) return true;
					if (dx < 0 && node.scrollLeft + node.clientWidth < node.scrollWidth - 2) return true;
				}
				node = node.parentElement;
			}
			return false;
		};
		const detachOriginListeners = () => {
			if (!originTarget || originTarget === window || typeof originTarget.removeEventListener !== "function") {
				originTarget = null;
				return;
			}
			try {
				originTarget.removeEventListener("touchmove", onMove);
				originTarget.removeEventListener("touchend", finishSwipe);
				originTarget.removeEventListener("touchcancel", finishSwipe);
			} catch {}
			originTarget = null;
		};
		const onMove = (event) => {
			if (!tracking) return;
			if (event === lastHandledMoveEvt) return;
			lastHandledMoveEvt = event;
			if (!event.touches || event.touches.length !== 1) {
				tracking = false;
				decided = null;
				detachOriginListeners();
				resetChatStyle();
				flushDeferredChatRender();
				return;
			}
			const touch = event.touches[0];
			const dx = touch.clientX - startX;
			const dy = touch.clientY - startY;
			lastX = touch.clientX;
			lastY = touch.clientY;
			if (decided === null) {
				if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
				if (Date.now() - startedAt > 400) {
					tracking = false;
					detachOriginListeners();
					flushDeferredChatRender();
					return;
				}
				if (Math.abs(dy) >= 12 && Math.abs(dy) > Math.abs(dx) * 1.12) {
					tracking = false;
					detachOriginListeners();
					flushDeferredChatRender();
					return;
				}
				if (Math.abs(dx) >= 10 && Math.abs(dx) >= Math.abs(dy) * 1.05) {
					if (canScrollHorizontally(originTarget || event.target, dx)) {
						tracking = false;
						detachOriginListeners();
						flushDeferredChatRender();
						return;
					}
					decided = true;
					swipeDir = dx > 0 ? 1 : -1;
					chat.style.transition = "none";
					chat.style.willChange = "transform";
				} else if (Math.hypot(dx, dy) > 26) {
					tracking = false;
					detachOriginListeners();
					flushDeferredChatRender();
					return;
				} else return;
			}
			const signedX = swipeDir === 1 ? Math.max(0, Math.min(dx, width)) : Math.max(-width, Math.min(0, dx));
			if (signedX === 0) return;
			if (event.cancelable) event.preventDefault();
			chat.style.transform = `translate3d(${signedX}px, 0, 0)`;
			chat.style.boxShadow = swipeDir === 1 ? "-10px 0 30px rgba(15, 23, 42, 0.16)" : "10px 0 30px rgba(15, 23, 42, 0.16)";
		};
		const finishSwipe = (event) => {
			if (!tracking) return;
			if (event && event === lastHandledEndEvt) return;
			lastHandledEndEvt = event || null;
			tracking = false;
			detachOriginListeners();
			const wasDecided = decided === true;
			const dir = swipeDir;
			decided = null;
			swipeDir = 0;
			if (!wasDecided) {
				flushDeferredChatRender();
				return;
			}
			const effDx = Math.max(0, dir === -1 ? startX - lastX : lastX - startX);
			const absDy = Math.abs(lastY - startY);
			const durationMs = Math.max(1, Date.now() - startedAt);
			const velocity = effDx / durationMs;
			const distThreshold = Math.min(Math.max(60, width * .17), 115);
			if (absDy <= effDx * 1.15 && (effDx >= distThreshold || effDx >= 30 && velocity >= .3 || shouldDismissHorizontalSwipe({
				dx: effDx,
				dy: absDy,
				width,
				durationMs
			}))) {
				chatTouchDownAt = 0;
				pendingChatRenderAfterTouch = false;
				if (dir === -1) {
					chat.style.transition = "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)";
					chat.style.transform = `translate3d(${-width}px, 0, 0)`;
					setTimeout(() => {
						chat.style.transition = "none";
						closeMobileChat();
						if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resetChatStyle());
						else resetChatStyle();
					}, 185);
				} else {
					resetChatStyle();
					closeMobileChat();
				}
			} else {
				chat.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
				chat.style.transform = "translate3d(0px, 0, 0)";
				setTimeout(() => {
					resetChatStyle();
					flushDeferredChatRender();
				}, 230);
			}
		};
		chat.addEventListener("touchstart", (event) => {
			if (event.touches.length !== 1) return;
			if (!document.body.classList.contains("mobile-chat-open")) return;
			if (isDesktopSplitLayout()) return;
			if (document.querySelector(".sheet-backdrop.open, #triageDeckOverlay.open")) return;
			if (isInteractiveSwipeExcluded(event.target)) return;
			detachOriginListeners();
			const touch = event.touches[0];
			const rect = chat.getBoundingClientRect();
			width = chat.offsetWidth || rect.width || window.innerWidth || 375;
			startRelX = touch.clientX;
			tracking = true;
			decided = null;
			swipeDir = 0;
			startX = touch.clientX;
			startY = touch.clientY;
			lastX = startX;
			lastY = startY;
			startedAt = Date.now();
			chatTouchDownAt = startedAt;
			originTarget = event.target;
			if (originTarget && originTarget !== window && originTarget !== chat && typeof originTarget.addEventListener === "function") try {
				originTarget.addEventListener("touchmove", onMove, { passive: false });
				originTarget.addEventListener("touchend", finishSwipe);
				originTarget.addEventListener("touchcancel", finishSwipe);
			} catch {}
		}, { passive: true });
		window.addEventListener("touchmove", onMove, { passive: false });
		window.addEventListener("touchend", finishSwipe);
		window.addEventListener("touchcancel", finishSwipe);
	}
	function setupSheetSwipeDismiss() {
		document.querySelectorAll(".sheet-backdrop").forEach((backdrop) => {
			const panel = backdrop.querySelector(".sheet-panel");
			if (!panel) return;
			const expandable = panel.dataset.expandable === "1" || backdrop.id === "inChatFileSheet";
			let tracking = false;
			let startX = 0;
			let startY = 0;
			let lastX = 0;
			let lastY = 0;
			let startedAt = 0;
			let dragMode = null;
			let startExpanded = false;
			let startH = 0;
			let defaultH = 0;
			let expandedH = 0;
			const resetPanelStyle = () => {
				panel.style.transition = "";
				panel.style.transform = "";
				panel.style.height = "";
				panel.style.willChange = "";
			};
			const hasScrolledInner = (target) => {
				let node = target;
				while (node && node !== panel && node.nodeType === 1) {
					const overflowY = window.getComputedStyle(node).overflowY;
					if (/(auto|scroll)/.test(overflowY) && node.scrollTop > 0) return true;
					node = node.parentElement;
				}
				return false;
			};
			let decided = false;
			panel.addEventListener("touchstart", (event) => {
				if (event.touches.length !== 1) return;
				const onChromeHandle = Boolean(expandable && event.target && typeof event.target.closest === "function" && event.target.closest(".sheet-drag-zone, .sheet-handle, .sheet-title, .breadcrumbs-bar"));
				if (!onChromeHandle && event.target && typeof event.target.closest === "function" && event.target.closest("img, video, iframe, pre, code, .file-preview-body")) {
					tracking = false;
					decided = false;
					dragMode = null;
					return;
				}
				if (!onChromeHandle && (panel.scrollTop > 0 || hasScrolledInner(event.target))) return;
				const touch = event.touches[0];
				tracking = true;
				decided = false;
				dragMode = null;
				startX = touch.clientX;
				startY = touch.clientY;
				lastX = startX;
				lastY = startY;
				startedAt = Date.now();
				if (expandable) {
					const vh = window.innerHeight || document.documentElement.clientHeight || 800;
					const safeTop = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue("--safe-top")) || 0;
					defaultH = Math.round(vh * .8);
					expandedH = Math.max(defaultH + 40, Math.round(vh * .97 - safeTop));
					startExpanded = panel.classList.contains("sheet-expanded");
					startH = Math.round(panel.getBoundingClientRect().height) || (startExpanded ? expandedH : defaultH);
				}
			}, { passive: true });
			panel.addEventListener("touchmove", (event) => {
				if (!tracking) return;
				const touch = event.touches[0];
				const dy = touch.clientY - startY;
				const dx = touch.clientX - startX;
				lastX = touch.clientX;
				lastY = touch.clientY;
				if (!decided) {
					const threshold = expandable ? 10 : 14;
					if (Math.abs(dy) < threshold && Math.abs(dx) < threshold) return;
					if (Math.abs(dx) > Math.abs(dy) * 1.15) {
						tracking = false;
						return;
					}
					if (dy < 0) {
						if (!expandable) {
							tracking = false;
							return;
						}
						dragMode = "expand";
						decided = true;
						panel.style.transition = "none";
						panel.style.willChange = "height";
					} else {
						dragMode = expandable && startExpanded ? "expand" : "dismiss";
						decided = true;
						panel.style.transition = "none";
						panel.style.willChange = dragMode === "expand" ? "height, transform" : "transform";
					}
				}
				if (dragMode === "expand") {
					if (event.cancelable) event.preventDefault();
					const rawNextH = startH - dy;
					if (rawNextH >= defaultH) {
						const clampedH = Math.min(expandedH, rawNextH);
						panel.style.height = `${clampedH}px`;
						panel.style.transform = "";
					} else {
						const overflowDown = defaultH - rawNextH;
						panel.style.height = `${defaultH}px`;
						panel.style.transform = `translateY(${overflowDown}px)`;
					}
					return;
				}
				if (dy <= 0) return;
				if (event.cancelable) event.preventDefault();
				panel.style.transform = `translateY(${dy}px)`;
			}, { passive: false });
			const finishSwipe = () => {
				if (!tracking) return;
				const wasDecided = decided;
				const mode = dragMode;
				tracking = false;
				decided = false;
				dragMode = null;
				if (!wasDecided) return;
				const dy = lastY - startY;
				const dx = lastX - startX;
				const durationMs = Math.max(1, Date.now() - startedAt);
				const vy = dy / durationMs;
				if (mode === "expand") {
					lastSheetDragEndAt = Date.now();
					if (!startExpanded) {
						const shouldExpand = dy <= -32 || vy <= -.28;
						panel.style.transition = "";
						panel.style.height = "";
						panel.style.transform = "";
						panel.style.willChange = "";
						setFileSheetExpanded(shouldExpand);
						return;
					}
					const rawEndH = startH - dy;
					if (Math.max(0, defaultH - rawEndH) >= 110 || dy >= 230 && vy >= .72) {
						panel.style.transition = "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)";
						panel.style.transform = `translateY(${panel.offsetHeight || 600}px)`;
						setTimeout(() => {
							closeSheet(backdrop.id);
							resetPanelStyle();
						}, 190);
						return;
					}
					const shouldCollapse = dy >= 36 || vy >= .3;
					panel.style.transition = "";
					panel.style.height = "";
					panel.style.transform = "";
					panel.style.willChange = "";
					setFileSheetExpanded(!shouldCollapse);
					return;
				}
				const dismiss = shouldDismissVerticalSwipe({
					dy: Math.max(0, dy),
					dx,
					height: panel.offsetHeight,
					durationMs
				});
				panel.style.transition = "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)";
				if (dismiss) {
					panel.style.transform = `translateY(${panel.offsetHeight || 600}px)`;
					setTimeout(() => {
						closeSheet(backdrop.id);
						resetPanelStyle();
					}, 190);
				} else {
					panel.style.transform = "translateY(0)";
					setTimeout(resetPanelStyle, 220);
				}
			};
			panel.addEventListener("touchend", finishSwipe);
			panel.addEventListener("touchcancel", finishSwipe);
		});
	}
	function setupStandaloneImageLongPressSave() {
		if (typeof document === "undefined" || !document.addEventListener) return;
		let holdImg = null;
		let holdStartX = 0;
		let holdStartY = 0;
		let holdReady = false;
		let holdTimer = null;
		let readyFile = null;
		let holdFileName = "image.png";
		const inferImgMime = (name) => /\.jpe?g$/i.test(name) ? "image/jpeg" : /\.webp$/i.test(name) ? "image/webp" : /\.gif$/i.test(name) ? "image/gif" : "image/png";
		const buildCanvasFallbackFile = (imgEl, safeName) => new Promise((resolve) => {
			try {
				const w = imgEl.naturalWidth || imgEl.width || 0;
				const h = imgEl.naturalHeight || imgEl.height || 0;
				if (!w || !h) return resolve(null);
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext("2d");
				if (!ctx) return resolve(null);
				ctx.drawImage(imgEl, 0, 0, w, h);
				const mime = inferImgMime(safeName);
				canvas.toBlob((blob) => {
					canvas.width = 0;
					canvas.height = 0;
					if (!blob) return resolve(null);
					resolve(new File([blob], safeName, { type: mime }));
				}, mime, .95);
			} catch {
				resolve(null);
			}
		});
		const prefetchShareableImageFile = async (imgEl, safeName) => {
			const rawUrl = imgEl.getAttribute("data-download-url") || imgEl.currentSrc || imgEl.src || "";
			if (!rawUrl) return null;
			try {
				const token = getToken();
				const resp = rawUrl.startsWith("data:") ? await fetch(rawUrl) : await fetch(rawUrl, { headers: token ? { authorization: `Bearer ${token}` } : {} });
				if (resp.ok) {
					const blob = await resp.blob();
					const mime = blob.type && blob.type.startsWith("image/") ? blob.type : inferImgMime(safeName);
					return new File([blob], safeName, { type: mime });
				}
			} catch {}
			return buildCanvasFallbackFile(imgEl, safeName);
		};
		const cleanupHold = () => {
			if (holdTimer) {
				clearTimeout(holdTimer);
				holdTimer = null;
			}
			if (holdImg) holdImg.style.transform = "";
			holdImg = null;
			holdReady = false;
			readyFile = null;
		};
		document.addEventListener("touchstart", (event) => {
			if (!isStandaloneApp() || event.touches.length !== 1) return;
			if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
			const target = event.target;
			const img = target && typeof target.closest === "function" ? target.closest("img.saveable-preview-img, img.md-inline-img") : null;
			if (!img) return;
			cleanupHold();
			const t = event.touches[0];
			holdImg = img;
			holdStartX = t.clientX;
			holdStartY = t.clientY;
			const rawName = img.getAttribute("data-file-name") || img.getAttribute("alt") || (img.src && !img.src.startsWith("data:") ? img.src.split("?")[0].split("/").pop() : "") || "image.png";
			holdFileName = /\.(png|jpe?g|webp|gif)$/i.test(rawName) ? rawName : `${rawName}.png`;
			prefetchShareableImageFile(img, holdFileName).then((file) => {
				if (holdImg === img && file) readyFile = file;
			});
			holdTimer = setTimeout(() => {
				holdTimer = null;
				if (!holdImg) return;
				holdReady = true;
				holdImg.style.transition = "transform 0.14s ease";
				holdImg.style.transform = "scale(0.975)";
				try {
					navigator.vibrate?.(12);
				} catch {}
				showToast("📥 松开手指即可保存或分享图片");
			}, 450);
		}, { passive: true });
		document.addEventListener("touchmove", (event) => {
			if (!holdImg) return;
			if (event.touches.length !== 1) {
				cleanupHold();
				return;
			}
			const t = event.touches[0];
			if (Math.hypot(t.clientX - holdStartX, t.clientY - holdStartY) > 12) cleanupHold();
		}, { passive: true });
		document.addEventListener("touchend", (event) => {
			if (!holdImg) return;
			const wasReady = holdReady;
			const fileToShare = readyFile;
			const nameToShare = holdFileName;
			const targetImg = holdImg;
			cleanupHold();
			if (!wasReady) return;
			if (event.cancelable) try {
				event.preventDefault();
			} catch {}
			const openShare = async (f) => {
				if (!f) return;
				if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [f] })) return;
				try {
					await navigator.share({
						files: [f],
						title: nameToShare
					});
				} catch {}
			};
			if (fileToShare) openShare(fileToShare);
			else buildCanvasFallbackFile(targetImg, nameToShare).then(openShare);
		}, { passive: false });
		document.addEventListener("touchcancel", cleanupHold, { passive: true });
	}
	function maybeShowSwipeHint() {
		if (!("ontouchstart" in window)) return;
		try {
			if (localStorage.getItem("dsh_swipe_hint_v1")) return;
			localStorage.setItem("dsh_swipe_hint_v1", "1");
		} catch {
			return;
		}
		setTimeout(() => showToast("💡 提示：左右滑动即可返回会话列表"), 600);
	}
	async function forceHardUpgradeReload() {
		showToast(langPref === "en" ? "🚀 Clearing cache & loading latest version…" : "🚀 正在清理旧缓存并拉取最新版本…");
		try {
			sessionStorage.removeItem("dsh_reloaded_ui_build");
		} catch {}
		try {
			if (typeof caches !== "undefined" && caches && typeof caches.keys === "function") {
				const keys = await caches.keys();
				await Promise.all(keys.map((k) => caches.delete(k)));
			}
		} catch {}
		try {
			if (typeof navigator !== "undefined" && navigator.serviceWorker?.getRegistrations) {
				const regs = await navigator.serviceWorker.getRegistrations();
				await Promise.all(regs.map((r) => r.update().catch(() => {})));
			}
		} catch {}
		reloadWithFreshAppShell("");
	}
	function setupMainViewportPullRefresh() {
		const vp = document.getElementById("mainViewport");
		const slot = document.getElementById("pullRefreshSlot");
		const pill = document.getElementById("pullRefreshPill");
		const label = document.getElementById("pullRefreshLabel");
		if (!vp || !slot || !pill || !label) return;
		const PULL_START_DY = 32;
		const STAGE1_DY = 155;
		const STAGE2_DY = 285;
		let tracking = false;
		let pulling = false;
		let startX = 0;
		let startY = 0;
		let currentDy = 0;
		let lastStage = 0;
		const collapseSlot = () => {
			slot.style.transition = "height 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
			slot.style.height = "0px";
			slot.classList.remove("active");
			pill.classList.remove("stage-1", "stage-2");
			lastStage = 0;
		};
		vp.addEventListener("touchstart", (event) => {
			if (event.touches.length !== 1) return;
			if (vp.scrollTop > .5) return;
			if (document.body.classList.contains("mobile-chat-open")) return;
			if (document.querySelector(".sheet-backdrop.open, #triageDeckOverlay.open")) return;
			const t = event.touches[0];
			tracking = true;
			pulling = false;
			startX = t.clientX;
			startY = t.clientY;
			currentDy = 0;
			lastStage = 0;
		}, { passive: true });
		vp.addEventListener("touchmove", (event) => {
			if (!tracking) return;
			if (event.touches.length !== 1) {
				tracking = false;
				if (pulling) collapseSlot();
				return;
			}
			const t = event.touches[0];
			const dx = t.clientX - startX;
			const dy = t.clientY - startY;
			if (!pulling) {
				if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
				if (dy <= 0 || vp.scrollTop > .5 || Math.abs(dy) < Math.abs(dx) * 1.35) {
					tracking = false;
					return;
				}
				if (dy < PULL_START_DY) return;
				pulling = true;
				slot.style.transition = "none";
				slot.classList.add("active");
			}
			currentDy = Math.max(0, dy);
			if (currentDy > PULL_START_DY && event.cancelable) event.preventDefault();
			const effDy = Math.max(0, currentDy - PULL_START_DY);
			const visualH = Math.min(96, Math.round(Math.pow(effDy, .72) * 1.8));
			slot.style.height = `${visualH}px`;
			const en = langPref === "en";
			const nextStage = currentDy >= STAGE2_DY ? 2 : currentDy >= STAGE1_DY ? 1 : 0;
			if (nextStage !== lastStage) {
				if (nextStage === 1 && lastStage === 0) try {
					navigator.vibrate?.(10);
				} catch {}
				else if (nextStage === 2) try {
					navigator.vibrate?.([
						16,
						28,
						22
					]);
				} catch {}
				lastStage = nextStage;
			}
			pill.classList.toggle("stage-1", nextStage === 1);
			pill.classList.toggle("stage-2", nextStage === 2);
			if (nextStage === 2) label.textContent = en ? "⚡ Ready! Release to force-update app" : "⚡ 已拉满！松手强制更新前端（清缓存重载）";
			else if (nextStage === 1) {
				const pct = Math.min(99, Math.max(1, Math.round((currentDy - STAGE1_DY) / 130 * 100)));
				label.textContent = en ? `↻ Release to sync · Pull harder to update (${pct}%)` : `↻ 松手同步状态 · 继续深拉重刷版本 (${pct}%)`;
			} else label.textContent = en ? "↓ Keep pulling to refresh…" : "↓ 继续向下拉刷新状态…";
		}, { passive: false });
		const finishPull = () => {
			if (!tracking) return;
			tracking = false;
			if (!pulling) return;
			pulling = false;
			const en = langPref === "en";
			if (currentDy >= STAGE2_DY) {
				slot.style.transition = "height 0.16s ease";
				slot.style.height = "48px";
				label.textContent = en ? "🚀 Updating to latest build…" : "🚀 正在清理缓存并加载最新版…";
				forceHardUpgradeReload();
				return;
			}
			if (currentDy >= STAGE1_DY) {
				slot.style.transition = "height 0.16s ease";
				slot.style.height = "42px";
				label.textContent = en ? "↻ Syncing latest sessions…" : "↻ 正在同步最新状态…";
				try {
					navigator.serviceWorker?.getRegistration?.().then((r) => r?.update?.()).catch(() => {});
				} catch {}
				if (!sseConnected) connectSSE();
				fetchState({
					silent: true,
					forceFresh: true
				}).finally(() => {
					label.textContent = en ? "✅ Synced" : "✅ 已同步最新状态";
					setTimeout(collapseSlot, 360);
				});
				return;
			}
			collapseSlot();
		};
		vp.addEventListener("touchend", finishPull);
		vp.addEventListener("touchcancel", finishPull);
	}
	function setupOverlayGestures() {
		setupChatSwipeBack();
		setupSheetSwipeDismiss();
		setupStandaloneImageLongPressSave();
		setupMainViewportPullRefresh();
	}
	function setupInstallHint() {
		const el = document.getElementById("installHint");
		if (!el) return;
		let dismissed = true;
		try {
			dismissed = localStorage.getItem("dsh_a2hs_dismissed_v1") === "1";
		} catch {}
		if (!shouldShowInstallHint({
			isIos: isIosDeviceForHint(),
			isStandalone: isStandaloneForHint(),
			dismissed
		})) {
			el.style.display = "none";
			return;
		}
		el.style.display = "flex";
		setTimeout(() => {
			el.classList.add("show");
		}, 1200);
	}
	function dismissInstallHint() {
		try {
			localStorage.setItem("dsh_a2hs_dismissed_v1", "1");
		} catch {}
		const el = document.getElementById("installHint");
		if (el) {
			el.classList.remove("show");
			el.style.display = "none";
		}
	}
	function preservePreviewUiState(nextState) {
		const prevHosts = hubState.hosts || [];
		for (const host of nextState.hosts || []) {
			const prevHostObj = prevHosts.find((h) => h.hostId === host.hostId);
			const prevListing = prevHostObj?.lastFsListing;
			if (prevListing && (!host.lastFsListing || (prevListing.at || 0) >= (host.lastFsListing.at || 0))) host.lastFsListing = prevListing;
			const prev = prevHostObj?.lastFilePreview;
			const next = host.lastFilePreview;
			if (prev && (!next || (prev.at || 0) > (next.at || 0))) host.lastFilePreview = prev;
			else if (prev && next && prev.at === next.at && prev.relPath === next.relPath) {
				next._showInMain = Boolean(prev._showInMain);
				next._showInDrawer = Boolean(prev._showInDrawer);
				next._origImage = Boolean(prev._origImage);
				next._transcodeVideo = Boolean(prev._transcodeVideo);
				next._rawVideo = Boolean(prev._rawVideo);
				if (!next.videoProbe && prev.videoProbe) next.videoProbe = prev.videoProbe;
				if (!next.streamUrl && prev.streamUrl) next.streamUrl = prev.streamUrl;
				if ((next.content === void 0 || prev._fullHtmlFetched) && prev.content !== void 0) {
					next.content = prev.content;
					if (prev._fullHtmlFetched) {
						next._fullHtmlFetched = true;
						next.kind = "text";
						next.truncated = false;
					}
				}
			}
			const pinnedDrawer = pinnedDrawerPreviewByHost[host.hostId];
			if (pinnedDrawer && next && next.relPath === pinnedDrawer.relPath && next.at >= (pinnedDrawer.at || 0)) {
				if ((next.content === void 0 || pinnedDrawer._fullHtmlFetched) && pinnedDrawer.content !== void 0) {
					next.content = pinnedDrawer.content;
					if (pinnedDrawer._fullHtmlFetched) {
						next._fullHtmlFetched = true;
						next.kind = "text";
						next.truncated = false;
					}
				}
				if (!next.streamUrl && pinnedDrawer.streamUrl) next.streamUrl = pinnedDrawer.streamUrl;
				if (!next.videoProbe && pinnedDrawer.videoProbe) next.videoProbe = pinnedDrawer.videoProbe;
				next._origImage = Boolean(pinnedDrawer._origImage);
				next._transcodeVideo = Boolean(pinnedDrawer._transcodeVideo);
				next._rawVideo = Boolean(pinnedDrawer._rawVideo);
				next._showInDrawer = true;
				pinnedDrawerPreviewByHost[host.hostId] = next;
			}
			const pinnedMain = pinnedMainPreviewByHost[host.hostId];
			if (pinnedMain && next && next.relPath === pinnedMain.relPath && next.at >= (pinnedMain.at || 0)) {
				if ((next.content === void 0 || pinnedMain._fullHtmlFetched) && pinnedMain.content !== void 0) {
					next.content = pinnedMain.content;
					if (pinnedMain._fullHtmlFetched) {
						next._fullHtmlFetched = true;
						next.kind = "text";
						next.truncated = false;
					}
				}
				if (!next.streamUrl && pinnedMain.streamUrl) next.streamUrl = pinnedMain.streamUrl;
				if (!next.videoProbe && pinnedMain.videoProbe) next.videoProbe = pinnedMain.videoProbe;
				next._origImage = Boolean(pinnedMain._origImage);
				next._transcodeVideo = Boolean(pinnedMain._transcodeVideo);
				next._rawVideo = Boolean(pinnedMain._rawVideo);
				next._showInMain = true;
				pinnedMainPreviewByHost[host.hostId] = next;
			}
		}
	}
	function tryOpenDeepLinkTarget({ hostId, agentId } = {}) {
		const targetTaskId = String(agentId || "").trim();
		const targetHostId = String(hostId || "").trim();
		if (targetHostId && (hubState.hosts || []).some((h) => h.hostId === targetHostId)) {
			if (currentHostId !== "ALL_HOSTS" && currentHostId !== targetHostId) currentHostId = targetHostId;
		}
		if (targetTaskId) {
			const found = findSessionGlobal(targetTaskId);
			if (found) {
				if (currentTab !== "chats") switchTab("chats");
				openChat(found.session.id);
				return true;
			}
			return false;
		}
		if (targetHostId && (hubState.hosts || []).some((h) => h.hostId === targetHostId)) {
			currentHostId = targetHostId;
			renderAll();
			return true;
		}
		return false;
	}
	function flushPendingDeepLink() {
		if (!pendingDeepLinkHostId && !pendingDeepLinkTaskId) return;
		if (tryOpenDeepLinkTarget({
			hostId: pendingDeepLinkHostId,
			agentId: pendingDeepLinkTaskId
		})) {
			pendingDeepLinkHostId = "";
			pendingDeepLinkTaskId = "";
		}
	}
	if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker) try {
		navigator.serviceWorker.addEventListener("message", (event) => {
			const msg = event?.data;
			if (msg && msg.type === "NOTIFICATION_CLICK" && msg.data) {
				const { hostId, agentId } = msg.data;
				if (!tryOpenDeepLinkTarget({
					hostId,
					agentId
				})) {
					pendingDeepLinkHostId = String(hostId || "").trim();
					pendingDeepLinkTaskId = String(agentId || "").trim();
					fetchState();
				}
			} else if (msg && msg.type === "DSH_SW_UPDATED") {
				const nextBuild = String(msg.uiBuild || "").trim();
				if (nextBuild && nextBuild !== "dev" && initialUiBuild && nextBuild !== initialUiBuild) triggerAppShellUpgradeReload(nextBuild);
			}
		});
		if (typeof navigator.serviceWorker.register === "function" && typeof window !== "undefined" && window.location && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) setTimeout(() => {
			try {
				navigator.serviceWorker.register("/sw.js").catch(() => {});
			} catch {}
		}, 1200);
	} catch {}
	function setConnectionBanner(disconnected, message = "") {
		const banner = document.getElementById("connectionStatusBanner");
		if (!banner) return;
		if (disconnected) {
			banner.textContent = message || "⚠️ 网络连接中断，正在自动重连… 点此立即重试";
			banner.style.display = "flex";
		} else banner.style.display = "none";
	}
	function detectLoadedBundleBuild() {
		if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return "";
		try {
			const scripts = document.querySelectorAll("script[src]");
			for (const sc of scripts) {
				const src = sc.getAttribute("src") || "";
				const m = /\/assets\/index-([A-Za-z0-9_-]+)\.js/.exec(src);
				if (m && m[1]) return m[1];
			}
		} catch {}
		return "";
	}
	let initialUiBuild = detectLoadedBundleBuild();
	const bootedFromHashedBundle = Boolean(initialUiBuild);
	let lastSavedStateCacheAt = 0;
	function saveCachedHubStateSnapshot(state) {
		const now = Date.now();
		if (now - lastSavedStateCacheAt < 5e3) return;
		lastSavedStateCacheAt = now;
		try {
			const compactHosts = (state?.hosts || []).map((h) => ({
				hostId: h.hostId,
				hostName: h.hostName,
				online: h.online,
				lastSeenAt: h.lastSeenAt,
				bridgeState: h.bridgeState ? {
					workspaces: h.bridgeState.workspaces || [],
					modelCatalog: h.bridgeState.modelCatalog || {},
					turbo: h.bridgeState.turbo || null,
					systemTelemetry: h.bridgeState.systemTelemetry || null,
					tasks: (h.bridgeState.tasks || []).map((t, tIdx) => {
						const isRecentSlot = tIdx < 8;
						const maxCachedLen = isRecentSlot ? 24e3 : 600;
						const srcTr = Array.isArray(t.transcript) ? t.transcript : [];
						const slicedCacheTr = srcTr.slice(-(isRecentSlot ? 6 : 2));
						let cacheSliced = Boolean(t.wireTruncated || !isRecentSlot && srcTr.length > slicedCacheTr.length);
						const cachedTranscript = slicedCacheTr.map((m) => {
							const rawText = String(m?.text || "");
							if (rawText.length > maxCachedLen) cacheSliced = true;
							return {
								index: m.index,
								role: m.role,
								text: rawText.slice(0, maxCachedLen),
								time: m.time,
								...isRecentSlot && m.thinking ? { thinking: String(m.thinking).slice(0, 2e3) } : {},
								...isRecentSlot && Array.isArray(m.tools) && m.tools.length > 0 ? { tools: m.tools.slice(0, 8) } : {},
								artifacts: m.artifacts || []
							};
						});
						return {
							id: t.id,
							rawId: t.rawId,
							shortId: t.shortId,
							harness: t.harness,
							harnessLabel: t.harnessLabel,
							model: t.model,
							title: t.title,
							status: t.status,
							turnState: t.turnState,
							statusLabel: t.statusLabel,
							project: t.project,
							cwd: t.cwd,
							lastActivity: t.lastActivity,
							updatedAt: t.updatedAt,
							lastConclusionAt: t.lastConclusionAt,
							lastOutput: String(t.lastOutput || "").slice(0, 260),
							runningSummary: String(t.runningSummary || "").slice(0, 200),
							pendingApproval: t.pendingApproval || null,
							changedFiles: Array.isArray(t.changedFiles) ? t.changedFiles.slice(-8) : [],
							artifacts: t.artifacts || [],
							messageCount: t.messageCount || 0,
							totalTranscriptCount: t.totalTranscriptCount || t.messageCount || srcTr.length,
							omittedTranscriptCount: Math.max(0, (t.totalTranscriptCount || t.messageCount || srcTr.length) - cachedTranscript.length),
							wireTruncated: cacheSliced,
							transcript: cachedTranscript
						};
					})
				} : { tasks: [] }
			}));
			localStorage.setItem("dsh_hub_state_cache_v1", JSON.stringify({
				cachedAt: now,
				activeHostId: state?.activeHostId || "",
				hosts: compactHosts
			}));
		} catch {}
	}
	function loadCachedHubStateSnapshot() {
		try {
			const raw = localStorage.getItem("dsh_hub_state_cache_v1");
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (parsed && Array.isArray(parsed.hosts) && parsed.hosts.length > 0 && Number(parsed.cachedAt || 0) > Date.now() - 36e5) return {
				hosts: parsed.hosts,
				activeHostId: parsed.activeHostId || "",
				migrations: [],
				shares: [],
				pushSubscriptions: []
			};
		} catch {}
		return null;
	}
	let pendingBackgroundUiReload = false;
	let pendingTargetUiBuild = "";
	function hasActiveUserInputInProgress() {
		if (typeof document === "undefined") return false;
		if (inFlightCommandCount > 0) return true;
		if (imagePickerActiveUntil > Date.now()) return true;
		if (isVoiceRecording()) return true;
		if (document.body.classList.contains("mobile-chat-open")) return true;
		if (document.querySelector(".sheet-backdrop.open, #triageDeckOverlay.open")) return true;
		const chatInput = document.getElementById("globalPromptInput");
		if (chatInput && String(chatInput.value || "").trim().length > 0) return true;
		const newInput = document.getElementById("newTaskInput") || document.getElementById("newTaskPromptInput");
		if (newInput && String(newInput.value || "").trim().length > 0) return true;
		if (composerAttachments.newTask.length > 0) return true;
		for (const list of chatAttachmentsBySession.values()) if (Array.isArray(list) && list.length > 0) return true;
		return false;
	}
	function recoverInterruptedOutboxEntries() {
		if (!hasLoadedInitialState) return;
		let raw = null;
		try {
			raw = sessionStorage.getItem(INFLIGHT_OUTBOX_KEY);
		} catch {}
		if (!raw) return;
		let map = null;
		try {
			map = JSON.parse(raw);
		} catch {}
		if (!map || typeof map !== "object") return;
		const now = Date.now();
		let changed = false;
		let restoredAny = false;
		for (const [cmdId, entry] of Object.entries(map)) {
			if (!entry || now - Number(entry.savedAt || 0) > 9e5) {
				delete map[cmdId];
				changed = true;
				continue;
			}
			if (now - Number(entry.savedAt || 0) < 2500 && inFlightCommandCount > 0) continue;
			const found = findSessionGlobal(entry.sessionId);
			const delivered = found ? hasCommandOrPromptDelivered(found.session, found.host, cmdId, entry.text || entry.rawText || "", entry.baselineSameUserCount || 0, entry.baselineTotalCount || 0) : false;
			delete map[cmdId];
			changed = true;
			if (delivered) continue;
			if (entry.rawText) writeComposerDraftValue(entry.sessionId, entry.rawText, {
				wireSameCount: entry.baselineSameUserCount || 0,
				wireTotalCount: entry.baselineTotalCount || 0,
				savedAt: now,
				fromErrorRestore: true,
				cmdId
			});
			if (Array.isArray(entry.attachments) && entry.attachments.length > 0) {
				const curList = getAttachmentList("chat", entry.sessionId);
				if (curList.length === 0) {
					for (const a of entry.attachments) {
						if (!a?.dataBase64) continue;
						const mime = String(a.mimeType || "image/jpeg");
						const b64 = String(a.dataBase64);
						curList.push({
							name: a.name || "screenshot.jpg",
							mimeType: mime,
							dataBase64: b64,
							sizeBytes: Number(a.sizeBytes || 0),
							previewUrl: b64.startsWith("data:") ? b64 : `data:${mime};base64,${b64}`
						});
					}
					persistChatAttachmentsDraft(entry.sessionId);
				}
			}
			const optMap = ensureOptimisticMsgsMap();
			if (optMap[entry.sessionId]) {
				optMap[entry.sessionId] = optMap[entry.sessionId].filter((it) => it.cmdId !== cmdId);
				persistOptimisticMsgsMap();
			}
			restoredAny = true;
		}
		if (changed) try {
			sessionStorage.setItem(INFLIGHT_OUTBOX_KEY, JSON.stringify(map));
		} catch {}
		if (restoredAny) {
			showToast("⚠️ 上次发送被页面刷新中断，已为你自动恢复文字与截图草稿");
			renderAll();
		}
	}
	function reloadWithFreshAppShell(targetBuild = "") {
		if (typeof window === "undefined" || !window.location) return;
		if (targetBuild) try {
			if (sessionStorage.getItem("dsh_reloaded_ui_build") === targetBuild) return;
			sessionStorage.setItem("dsh_reloaded_ui_build", targetBuild);
		} catch {}
		closeSSE();
		try {
			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.set("_r", String(Date.now()));
			window.location.replace(nextUrl.toString());
			return;
		} catch {}
		if (typeof window.location.reload === "function") window.location.reload();
	}
	function triggerAppShellUpgradeReload(nextBuild) {
		if (!nextBuild || nextBuild === "dev") return;
		pendingTargetUiBuild = nextBuild;
		if (!hasActiveUserInputInProgress()) {
			reloadWithFreshAppShell(nextBuild);
			return;
		}
		pendingBackgroundUiReload = true;
	}
	function applyHubState(nextState, { skipCache = false } = {}) {
		const incomingBuild = String(nextState?.build?.uiBuild || "").trim();
		if (incomingBuild && incomingBuild !== "dev") {
			if (!initialUiBuild) initialUiBuild = incomingBuild;
			else if (initialUiBuild !== incomingBuild) {
				const staleBootMismatch = bootedFromHashedBundle;
				initialUiBuild = incomingBuild;
				const isHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
				if ((staleBootMismatch || isHidden) && !hasActiveUserInputInProgress()) {
					reloadWithFreshAppShell(incomingBuild);
					return;
				}
				pendingTargetUiBuild = incomingBuild;
				pendingBackgroundUiReload = true;
			}
		}
		preservePreviewUiState(nextState);
		hubState = nextState;
		if (!skipCache) saveCachedHubStateSnapshot(nextState);
	}
	let hasLoadedInitialState = false;
	let hasLoadedFullState = false;
	let fullStateUpgradeQueued = false;
	let stateFetchInFlight = false;
	let inFlightStatePromise = null;
	let inFlightStateToken = "";
	let inFlightNeedsFollowup = false;
	let lastStateFetchAt = 0;
	let stateFetchSeq = 0;
	let consecutiveStateFetchFailures = 0;
	let sseSource = null;
	let sseConnected = false;
	let sseUsingLite = false;
	let lastSseEventAt = 0;
	let lastSseStateAt = 0;
	let sseRotatingUntil = 0;
	async function fetchStateOnceWithTimeout(timeoutMs = 3e4) {
		if (!hasLoadedInitialState) {
			const preloaded = typeof window !== "undefined" ? window.__dshPreloadState : null;
			if (preloaded) {
				window.__dshPreloadState = null;
				if (preloaded.token === getToken() && Date.now() - (preloaded.startedAt || 0) < 25e3) {
					const preRes = await preloaded.promise;
					if (preRes?.__status === 401) {
						authLockConfirmed = true;
						closeSSE();
						document.getElementById("authOverlay")?.classList.add("show");
						throw new Error("Unauthorized");
					}
					if (preRes?.__status === 200 && preRes.data) {
						authLockConfirmed = false;
						document.getElementById("authOverlay")?.classList.remove("show");
						return preRes.data;
					}
				}
			}
		}
		const useFullEndpoint = hasLoadedInitialState;
		const ctrl = typeof AbortController === "function" ? new AbortController() : null;
		const timer = ctrl ? setTimeout(() => {
			try {
				ctrl.abort();
			} catch {}
		}, timeoutMs) : null;
		try {
			const json = await (await apiFetch(useFullEndpoint ? "/api/state" : "/api/state?lite=1", ctrl ? { signal: ctrl.signal } : {})).json();
			if (json && typeof json === "object" && useFullEndpoint) json.__isFullState = true;
			return json;
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
	async function runSingleStateFetch({ silent = false } = {}) {
		const mySeq = ++stateFetchSeq;
		stateFetchInFlight = true;
		try {
			let data = null;
			let lastErr = null;
			for (let attempt = 0; attempt < 2; attempt += 1) try {
				data = await fetchStateOnceWithTimeout(3e4);
				lastErr = null;
				break;
			} catch (err) {
				lastErr = err;
				const msg = err && err.message ? err.message : String(err);
				if (msg === "Unauthorized" || msg === "Superseded") throw err;
				if (mySeq < stateFetchSeq) return {
					ok: true,
					superseded: true
				};
				if (attempt === 0) await new Promise((r) => setTimeout(r, 350));
			}
			if (lastErr) throw lastErr;
			if (mySeq < stateFetchSeq) return {
				ok: true,
				superseded: true
			};
			if (data && data.ok) {
				const isFullPayload = Boolean(data.__isFullState);
				delete data.__isFullState;
				hasLoadedInitialState = true;
				if (isFullPayload) hasLoadedFullState = true;
				lastStateFetchAt = Date.now();
				consecutiveStateFetchFailures = 0;
				setConnectionBanner(false);
				applyHubState(data);
				if (isFullPayload) recoverInterruptedOutboxEntries();
				renderAll();
				flushPendingDeepLink();
				ensureLocalPushSubscriptionSynced();
				if (isFullPayload && sseConnected && sseUsingLite) connectSSE();
				else if (!hasLoadedFullState && !fullStateUpgradeQueued) {
					fullStateUpgradeQueued = true;
					setTimeout(() => {
						fullStateUpgradeQueued = false;
						if ((getToken() || !authLockConfirmed) && !hasLoadedFullState) fetchState({
							silent: true,
							forceFresh: true
						});
					}, 120);
				}
				return { ok: true };
			}
			return {
				ok: false,
				error: data && data.error || "服务端返回异常"
			};
		} catch (err) {
			if (mySeq < stateFetchSeq) return {
				ok: true,
				superseded: true
			};
			const message = err && err.message ? err.message : String(err);
			if (message === "Superseded") return {
				ok: true,
				superseded: true
			};
			if (message !== "Unauthorized") {
				consecutiveStateFetchFailures += 1;
				const sseHealthy = sseConnected && Date.now() - lastSseEventAt < 3e4;
				if (typeof navigator !== "undefined" && navigator.onLine === false || !sseHealthy && (!silent || consecutiveStateFetchFailures >= 2)) setConnectionBanner(true);
			}
			return {
				ok: false,
				unauthorized: message === "Unauthorized",
				error: message
			};
		} finally {
			if (mySeq === stateFetchSeq) stateFetchInFlight = false;
		}
	}
	async function fetchState(opts = {}) {
		const silent = Boolean(opts && typeof opts === "object" && opts.silent);
		const forceFresh = Boolean(opts && typeof opts === "object" && opts.forceFresh);
		const reqToken = getToken();
		if (inFlightStatePromise) {
			if (reqToken !== inFlightStateToken) {
				stateFetchSeq += 1;
				inFlightStatePromise = null;
				inFlightNeedsFollowup = false;
			} else {
				if (forceFresh) inFlightNeedsFollowup = true;
				return inFlightStatePromise;
			}
		}
		inFlightStateToken = reqToken;
		const currentPromise = (async () => {
			let res = await runSingleStateFetch({ silent });
			if (inFlightNeedsFollowup && res?.ok && getToken() === reqToken) {
				inFlightNeedsFollowup = false;
				res = await runSingleStateFetch({ silent: true });
			}
			inFlightNeedsFollowup = false;
			return res;
		})();
		inFlightStatePromise = currentPromise;
		try {
			return await currentPromise;
		} finally {
			if (inFlightStatePromise === currentPromise) inFlightStatePromise = null;
		}
	}
	function scheduleFallbackStateSync() {
		const triggeredAt = Date.now();
		if (!sseConnected) {
			setTimeout(() => {
				fetchState({
					silent: true,
					forceFresh: true
				});
			}, 250);
			setTimeout(() => {
				fetchState({
					silent: true,
					forceFresh: true
				});
			}, 900);
			return;
		}
		setTimeout(() => {
			if (lastSseStateAt < triggeredAt) fetchState({
				silent: true,
				forceFresh: true
			});
		}, 900);
	}
	function closeSSE() {
		if (sseSource) {
			try {
				sseSource.close();
			} catch {}
			sseSource = null;
		}
		sseConnected = false;
	}
	function connectSSE() {
		if (urlParams.get("nosse") === "1") return;
		if (!getToken() && authLockConfirmed) return;
		const prevSseEventAt = lastSseEventAt;
		closeSSE();
		const tk = getToken();
		const knownSeq = hasLoadedInitialState ? Number(hubState?.stateSeq || 0) : 0;
		sseUsingLite = !hasLoadedFullState;
		const url = "/api/events?initial=0&delta=1" + (sseUsingLite ? "&lite=1" : "") + (knownSeq > 0 ? "&seq=" + encodeURIComponent(String(knownSeq)) : "") + (tk ? "&token=" + encodeURIComponent(tk) : "");
		try {
			sseSource = new EventSource(url);
			sseSource.onopen = () => {
				sseConnected = true;
				sseRotatingUntil = 0;
				lastSseEventAt = Date.now();
				consecutiveStateFetchFailures = 0;
				setConnectionBanner(false);
				if (!stateFetchInFlight && (!hasLoadedInitialState || prevSseEventAt > 0 && Date.now() - prevSseEventAt > 15e3)) fetchState({ silent: hasLoadedInitialState });
			};
			sseSource.onerror = () => {
				sseConnected = false;
			};
			sseSource.addEventListener("ping", (evt) => {
				sseConnected = true;
				sseRotatingUntil = 0;
				lastSseEventAt = Date.now();
				consecutiveStateFetchFailures = 0;
				setConnectionBanner(false);
				try {
					if (evt?.data && hasLoadedInitialState && !stateFetchInFlight && Date.now() - lastStateFetchAt > 1e4) {
						const pingData = JSON.parse(evt.data);
						const serverSeq = Number(pingData?.stateSeq || 0);
						const localSeq = Number(hubState?.stateSeq || 0);
						if (serverSeq > 0 && localSeq > 0 && serverSeq !== localSeq) fetchState({
							silent: true,
							forceFresh: true
						});
					}
				} catch {}
			});
			sseSource.addEventListener("rotate", () => {
				sseRotatingUntil = Date.now() + 5e3;
				connectSSE();
			});
			sseSource.addEventListener("state_delta", (evt) => {
				try {
					sseConnected = true;
					sseRotatingUntil = 0;
					const nowEvt = Date.now();
					lastSseEventAt = nowEvt;
					lastSseStateAt = nowEvt;
					consecutiveStateFetchFailures = 0;
					setConnectionBanner(false);
					if (!hasLoadedInitialState) {
						inFlightNeedsFollowup = true;
						if (!stateFetchInFlight) fetchState({
							silent: true,
							forceFresh: true
						});
						return;
					}
					const delta = JSON.parse(evt.data);
					const merged = applyStateDelta(hubState, delta);
					if (!merged.ok) {
						if (!stateFetchInFlight && nowEvt - lastStateFetchAt > 4e3) fetchState({
							silent: true,
							forceFresh: true
						});
						return;
					}
					if (!merged.noop) {
						lastStateFetchAt = nowEvt;
						applyHubState(merged.state, { skipCache: Boolean(merged.metaOnly) });
						if (!merged.metaOnly) {
							renderAll();
							flushPendingDeepLink();
						}
					}
				} catch {}
			});
			sseSource.addEventListener("state", (evt) => {
				try {
					sseConnected = true;
					sseRotatingUntil = 0;
					const nowEvt = Date.now();
					lastSseEventAt = nowEvt;
					lastSseStateAt = nowEvt;
					consecutiveStateFetchFailures = 0;
					setConnectionBanner(false);
					const data = JSON.parse(evt.data);
					if (data.ok) {
						hasLoadedInitialState = true;
						lastStateFetchAt = nowEvt;
						applyHubState(data);
						renderAll();
						flushPendingDeepLink();
					}
				} catch {}
			});
		} catch {}
	}
	function manualReconnectNow() {
		setConnectionBanner(true, "🔄 正在重新连接总控台…");
		connectSSE();
		fetchState();
	}
	if (typeof window !== "undefined") {
		window.addEventListener("online", () => {
			setConnectionBanner(false);
			connectSSE();
			fetchState();
		});
		window.addEventListener("offline", () => {
			sseConnected = false;
			setConnectionBanner(true, "⚠️ 当前手机网络已断开，恢复网络后将自动重连");
		});
	}
	Object.assign(window, {
		getToken,
		authHeaders,
		apiFetch,
		submitAuthLogin,
		lockAndLogout,
		dismissLiveBanner,
		setPreviewMode,
		applyTheme,
		setThemePreference,
		getLangPref: () => langPref,
		setLangPreference: setLangPreference$1,
		toggleLangPreference,
		applyLangToDom,
		esc: esc$1,
		cleanPreviewText,
		formatTime,
		formatBytes,
		showToast,
		getNormalizedSessions,
		findSessionGlobal,
		getHostProjects,
		renderAll,
		renderProjectStrip,
		renderSessionList,
		resetSessionFilters,
		openChat,
		rawCloseChat,
		closeMobileChat,
		closeMobileFile,
		setFileSheetExpanded,
		toggleFileSheetExpanded,
		selectAgyApprovalOption,
		submitAgyApproval,
		copyAssistantReply,
		copyLatestAssistantReply,
		toggleSpeakAssistantReply,
		stopAssistantSpeech,
		switchAssistantSpeechMode,
		cycleAssistantSpeechRate,
		loadEarlierTranscript,
		renderActiveChatStage,
		renderInlineMarkdown,
		renderMarkdownBlocks,
		renderMarkdown,
		formatAssistantText,
		scrollToChatBottom,
		setScrollBottomVisible,
		setupChatScrollWatcher,
		dispatchHostCommand,
		composerDraftKey,
		readComposerDraft,
		clearComposerDraft,
		persistComposerDraft,
		reconcileDeliveredComposerDraft,
		autoGrowComposer,
		onComposerInput,
		composerUsesCoarsePointer,
		shouldSendOnEnter,
		onComposerKeydown,
		switchComposerSession,
		getAttachmentList,
		clearChatAttachmentList,
		triggerImagePicker,
		onChatImageSelected,
		onComposerPaste,
		removeComposerAttachment,
		renderAttachmentStrip,
		compressImageFile,
		hideVoiceHintBar,
		setVoiceBtnRecording,
		isVoiceRecording,
		stopVoiceInput,
		toggleVoiceInput: (...args) => {
			stopAssistantSpeech();
			return toggleVoiceInput(...args);
		},
		initWechatVoiceMode,
		isWechatVoiceMode,
		setWechatVoiceMode,
		toggleWechatVoiceMode,
		syncWechatHoldBtnState,
		startHoldVoice: (...args) => {
			stopAssistantSpeech();
			return startHoldVoice(...args);
		},
		moveHoldVoice,
		endHoldVoice,
		cancelHoldVoice,
		sendPromptToActiveSession,
		cancelQueuedCommand,
		sendQuickFollowup,
		stopActiveSession,
		sendApprovalDecision,
		openInChatFileDrawer,
		openChangedFilesDrawer,
		openUserBubbleImage,
		openOptimisticImagePreview,
		toggleSessionArtifactsCard,
		toggleFilesChangedCard,
		reviewFilesChangedCard,
		previewKind,
		imagePreviewSrc,
		buildBreadcrumbSegments,
		renderInChatFileDrawerBody,
		backFromDrawerPreview,
		quoteFileIntoChat,
		sleepMs,
		fileLoadingSpinnerHtml,
		reconcileFileLoading,
		requestDirList,
		clickRealFileEntry,
		renderFilePanes,
		cancelFilePreviewLoading,
		renderFilesTab,
		closeMainFilePreview,
		askAiAboutFile,
		switchDesktopStage,
		openNewTaskSheet,
		renderNewTaskForm,
		selectNewTaskHost,
		selectNewTaskHarness,
		selectNewTaskProject,
		openNewTaskProjectPickerSheet,
		switchNewTaskPickerMode,
		browseNewTaskDir,
		selectBrowsedNewTaskDir,
		openCreateUnderCurrentBrowseDir,
		onNewWorkspaceInput,
		confirmCreateNewWorkspace,
		filterNewTaskProjects,
		fillQuickPrompt,
		submitNewTask,
		openCurrentSessionActions,
		openSessionActions,
		renderActionSheet,
		togglePinTargetSession,
		saveInlineRename,
		shareTargetSession,
		openShareResultSheet,
		deleteShareRecord,
		openPairingCodeSheet,
		closePairingCodeSheet,
		generateNewPairingCode,
		updatePairingQrBaseOrigin,
		copyCurrentPairingLink,
		dismissStep6QrBanner,
		toggleAddHostPanel,
		toggleHostSettingsCard,
		syncSessionReadToServer,
		renderAddHostPanelHtml,
		refreshEnrollmentCode,
		revokeHostCredential,
		unrevokeHostCredential,
		jumpToSessionFiles,
		deleteTargetSession,
		renderSettingsTab,
		refreshPushStatus,
		disableIphonePush,
		activateFeishuHost,
		toggleHostRemoteMode,
		promptChangePassword,
		openMigrateWizard,
		renderMigrateWizard,
		swapMigrateHosts,
		submitRealMigration,
		urlBase64ToUint8Array,
		isIosDevice,
		isStandaloneApp,
		subscribeIphonePush,
		sendTestPush,
		getDshQuestionDraft,
		toggleDshQuestionOption,
		onDshQuestionCustomInput,
		submitDshQuestionAnswers,
		openHostSheet,
		selectHost,
		selectProject,
		switchTab,
		closeSheet,
		onSearchInput,
		clearSearch,
		copyText,
		openCopyFallbackSheet,
		retryCopyFromFallbackSheet,
		copyCodeText,
		openTurboGuideSheet,
		requestHostAxPermission,
		compareSemver,
		upgradeHostTurbo,
		hydrateColdSessionTranscript,
		scheduleFallbackStateSync,
		openModelPickerSheet,
		selectModelFromPicker,
		rawCloseSheet,
		trackOverlay,
		openSheet,
		openChatFileLink,
		toggleMdPreviewMode,
		toggleHtmlPreviewMode,
		openInlineHtmlPreview,
		openFullscreenHtmlFromPreview,
		closeFullscreenHtmlPreview,
		toggleFullscreenHtmlSource,
		reloadFullscreenHtmlPreview,
		downloadPreviewMedia,
		toggleOriginalPreviewImage,
		switchVideoTranscodeMode,
		mountSmartVideoElement,
		maybeAccelerateVideoViaP2p,
		onSmartVideoLoadedMeta,
		onSmartVideoError,
		dismissOverlay,
		shouldDismissHorizontalSwipe,
		shouldDismissVerticalSwipe,
		setupChatSwipeBack,
		setupSheetSwipeDismiss,
		maybeShowSwipeHint,
		setupOverlayGestures,
		isIosDeviceForHint,
		isStandaloneForHint,
		shouldShowInstallHint,
		setupInstallHint,
		dismissInstallHint,
		preservePreviewUiState,
		tryOpenDeepLinkTarget,
		flushPendingDeepLink,
		setConnectionBanner,
		manualReconnectNow,
		forceHardUpgradeReload,
		applyHubState,
		getHubState: () => hubState,
		fetchState,
		connectSSE,
		renderHarnessBadgeHtml,
		formatCompactProjectLabel,
		normalizeDeviceModelShort,
		buildShortHostNameMap,
		stripRedundantProjectPrefix
	});
	triageCtrl = createTriageDeckController({
		getSessions: () => getNormalizedSessions(),
		getShortHostMap: () => buildShortHostNameMap(hubState.hosts || []),
		getMediaTicket: () => hubState.mediaTicket || "",
		getLang: () => langPref,
		showToast,
		formatAssistantText,
		punctuateSpeechText,
		hydrateColdSession: (hostId, sessionId, sessionRev) => hydrateColdSessionTranscript(hostId, sessionId, sessionRev),
		openSession: (sessionId) => openChat(sessionId),
		openFileForSession: (sessionId, rawPath) => {
			const found = findSessionGlobal(sessionId);
			if (found) {
				activeSessionId = found.session.id;
				found.session.hostId;
			}
			openChatFileLink(encodeURIComponent(rawPath));
		},
		sendApprovalDecision: (hostId, code, allow, optionIndex, sessionId) => sendApprovalDecision(hostId, code, allow, optionIndex, sessionId),
		submitQuestionDecision: async (session, code, partialAnswers = {}) => {
			const finalAnswers = { ...partialAnswers };
			(Array.isArray(session?.approvalObj?.questions) ? session.approvalObj.questions : []).forEach((q, idx) => {
				const qId = String(q.id || `q_${idx + 1}`);
				if (finalAnswers[qId] === void 0) {
					const firstLbl = Array.isArray(q.options) && q.options[0]?.label ? String(q.options[0].label) : "";
					finalAnswers[qId] = q.multiSelect ? firstLbl ? [firstLbl] : [] : firstLbl;
				}
			});
			window.__dshSettlingApprovals = window.__dshSettlingApprovals || {};
			if (code) window.__dshSettlingApprovals[code] = {
				at: Date.now(),
				decision: "approve"
			};
			lastRenderedChatKey = "";
			renderAll();
			showToast("⏳ 正在将你的选择同步到电脑端...");
			try {
				const res = await dispatchHostCommand(session.hostId, {
					type: "approval",
					code,
					agentId: session.id,
					allow: true,
					optionIndex: 1,
					answers: finalAnswers
				});
				if (!res || res.ok === false) {
					if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
					lastRenderedChatKey = "";
					renderAll();
					showToast("❌ 提交选择失败：" + (res?.error || "请重试"));
					return;
				}
			} catch (err) {
				if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
				lastRenderedChatKey = "";
				renderAll();
				showToast("❌ 提交选择异常：" + (err?.message || err));
				return;
			}
			scheduleFallbackStateSync();
		},
		sendPromptToSession: async (session, rawPromptText) => {
			const text = String(rawPromptText || "").trim();
			if (!session || !text) return;
			const clientCmdId = `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
			const optMap = ensureOptimisticMsgsMap();
			const wireTr = Array.isArray(session._wireTranscript) ? session._wireTranscript : [];
			const probeOpt = {
				text,
				rawText: text
			};
			const baselineSameUserCount = wireTr.filter((m) => m && m.role === "user" && matchesOptimisticUserText(m.text, probeOpt)).length;
			const baselineTotalCount = Number(session._wireTotalCount) || wireTr.length;
			const optEntry = {
				id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
				cmdId: clientCmdId,
				text,
				rawText: text,
				time: Date.now(),
				baselineSameUserCount,
				baselineTotalCount
			};
			const optList = optMap[session.id] || [];
			optList.push(optEntry);
			optMap[session.id] = optList.slice(-8);
			persistOptimisticMsgsMap();
			lastRenderedChatKey = "";
			if (activeSessionId === session.id) renderActiveChatStage();
			const chosenChatModel = selectedSessionModels[session.id] || "";
			try {
				const res = await dispatchHostCommand(session.hostId, {
					id: clientCmdId,
					type: session.status === "running" ? "steer" : "prompt",
					agentId: session.id,
					cwd: session.cwd || "",
					text,
					prompt: text,
					...chosenChatModel ? { model: chosenChatModel } : {}
				});
				if (!res || res.ok === false) {
					optMap[session.id] = (optMap[session.id] || []).filter((item) => item.id !== optEntry.id);
					persistOptimisticMsgsMap();
					showToast("❌ " + (res?.error || "发送指令失败"));
					renderAll();
					return;
				}
				showToast("📨 已发送新方案指令");
			} catch (err) {
				optMap[session.id] = (optMap[session.id] || []).filter((item) => item.id !== optEntry.id);
				persistOptimisticMsgsMap();
				showToast("❌ 发送失败：" + (err?.message || err));
				renderAll();
				return;
			}
			scheduleFallbackStateSync();
		},
		markSessionRead: (session) => {
			if (!session?.id) return null;
			const prevSnapshot = {
				hasSeenAt: Object.prototype.hasOwnProperty.call(seenMap, session.id),
				seenAt: seenMap[session.id],
				hasSeenSig: Object.prototype.hasOwnProperty.call(seenSigMap, session.id),
				seenSig: seenSigMap[session.id],
				srvRead: hubState.sessionReadState?.[session.id] ? { ...hubState.sessionReadState[session.id] } : null
			};
			const readTs = Math.max(session.updatedAt || 0, session.lastConclusionAt || 0, session.lastInterruptedAt || 0, Date.now());
			seenMap[session.id] = readTs;
			if (session.conclusionSig) seenSigMap[session.id] = session.conclusionSig;
			try {
				localStorage.setItem("dsh_seen_v4", JSON.stringify(seenMap));
				localStorage.setItem("dsh_seen_sig_v1", JSON.stringify(seenSigMap));
			} catch {}
			syncSessionReadToServer(session.id, session.conclusionSig || "", readTs);
			return prevSnapshot;
		},
		restoreSessionUnread: (sessionId, prevSnapshot) => {
			if (!sessionId || !prevSnapshot) return;
			if (prevSnapshot.hasSeenAt && prevSnapshot.seenAt) seenMap[sessionId] = prevSnapshot.seenAt;
			else seenMap[sessionId] = 1;
			if (prevSnapshot.hasSeenSig && prevSnapshot.seenSig !== void 0) seenSigMap[sessionId] = prevSnapshot.seenSig;
			else delete seenSigMap[sessionId];
			hubState.sessionReadState = hubState.sessionReadState || {};
			if (prevSnapshot.srvRead) hubState.sessionReadState[sessionId] = { ...prevSnapshot.srvRead };
			else hubState.sessionReadState[sessionId] = {
				unread: true,
				sig: "",
				at: 1
			};
			try {
				localStorage.setItem("dsh_seen_v4", JSON.stringify(seenMap));
				localStorage.setItem("dsh_seen_sig_v1", JSON.stringify(seenSigMap));
			} catch {}
		},
		switchToRunningList: () => selectProject("SMART_ACTIVE"),
		onDeckChanged: () => {
			lastRenderedStripKey = "";
			lastRenderedListKey = "";
			renderAll();
		}
	});
	setupOverlayGestures();
	setupChatScrollWatcher();
	setupInstallHint();
	clearHomeScreenAppBadge();
	function resumeForegroundSync({ resetTransforms = false } = {}) {
		clearHomeScreenAppBadge();
		if (resetTransforms && typeof document !== "undefined") {
			const chatEl = document.getElementById("chatFullscreen");
			if (chatEl && chatEl.style) {
				chatEl.style.transition = "";
				chatEl.style.transform = "";
			}
		}
		if (!getToken() || authLockConfirmed) return;
		const idleMs = Date.now() - lastSseEventAt;
		if (!stateFetchInFlight && (!sseConnected || idleMs > 15e3)) fetchState({ silent: true });
		if (!sseConnected || idleMs > 25e3) connectSSE();
	}
	if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") resumeForegroundSync();
		else if (document.visibilityState === "hidden" && pendingBackgroundUiReload && !hasActiveUserInputInProgress()) {
			pendingBackgroundUiReload = false;
			reloadWithFreshAppShell(pendingTargetUiBuild);
		}
	});
	if (typeof window !== "undefined") {
		window.addEventListener("focus", () => {
			clearHomeScreenAppBadge();
		});
		window.addEventListener("pageshow", (evt) => {
			resumeForegroundSync({ resetTransforms: Boolean(evt && evt.persisted) });
		});
	}
	if (getToken()) {
		const cachedSnapshot = loadCachedHubStateSnapshot();
		if (cachedSnapshot) hubState = cachedSnapshot;
	}
	try {
		initWechatVoiceMode();
		renderAll();
	} catch {}
	if (queryPairCode) (async () => {
		try {
			const exRes = await fetch("/api/pairing/exchange", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ code: queryPairCode.toUpperCase() })
			});
			const exData = await exRes.json().catch(() => ({}));
			if (exRes.ok && exData.token) {
				authLockConfirmed = false;
				localStorage.setItem("dsh_hub_token", exData.token);
				showToast("🔓 扫码登录成功");
			} else {
				authLockConfirmed = !getToken();
				showToast("⚠️ 扫码配对码已过期或无效，请重新扫码");
			}
		} catch {}
		if (getToken() || !authLockConfirmed) {
			await fetchState();
			connectSSE();
		} else document.getElementById("authOverlay")?.classList.add("show");
	})();
	else if (getToken()) (async () => {
		await fetchState();
		if (getToken() && !authLockConfirmed) connectSSE();
	})();
	else {
		document.getElementById("authOverlay")?.classList.add("show");
		authLockConfirmed = true;
		(async () => {
			const check = await verifyCandidateToken("", 15e3);
			if (getToken()) return;
			if (check.ok && !check.authRequired) {
				authLockConfirmed = false;
				document.getElementById("authOverlay")?.classList.remove("show");
				await fetchState();
				connectSSE();
			}
		})();
	}
	setInterval(() => {
		if (Date.now() < sseRotatingUntil) return;
		if (!getToken() && authLockConfirmed) return;
		if (!stateFetchInFlight && (!sseConnected || Date.now() - lastSseEventAt > 35e3)) fetchState({ silent: true });
	}, 5e3);
}
// hub/web/src/main.tsx
var root = document.getElementById("app");
if (root) {
	K(/* @__PURE__ */ k(App, null), root);
	initHubController();
}
