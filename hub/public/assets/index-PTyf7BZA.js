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
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "voice-btn image-upload-btn",
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
		class: "voice-btn",
		id: "chatVoiceBtn",
		title: "语音输入（点击说话，再点停止）",
		"aria-label": "语音输入",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.toggleVoiceInput?.("globalPromptInput", "chatVoiceBtn");
		}
	}, "🎤"), /* @__PURE__ */ k("textarea", {
		class: "chat-input",
		id: "globalPromptInput",
		rows: 1,
		placeholder: "发指令或点左侧🖼️传截图...",
		autocorrect: "on",
		autocapitalize: "sentences",
		spellcheck: true,
		onInput: () => window.onComposerInput?.(),
		onKeyDown: (e) => window.onComposerKeydown?.(e),
		onPaste: (e) => window.onComposerPaste?.(e, "chat")
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "send-btn",
		id: "chatSendBtn",
		onClick: () => window.sendPromptToActiveSession?.()
	}, "发送")));
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
	}, /* @__PURE__ */ k("div", { class: "sheet-panel" }, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", { class: "sheet-title" }, /* @__PURE__ */ k("span", null, "✨ 新建远程对话任务"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeSheet?.("newTaskSheet")
	}, "✕")), /* @__PURE__ */ k("div", { class: "form-label" }, "1. 选择执行电脑"), /* @__PURE__ */ k("div", {
		class: "chip-selector",
		id: "newTaskHostChips"
	}), /* @__PURE__ */ k("div", { class: "form-label" }, "2. 选择执行引擎 (Harness / IDE)"), /* @__PURE__ */ k("div", {
		class: "chip-selector",
		id: "newTaskHarnessChips"
	}), /* @__PURE__ */ k("div", { class: "form-label" }, "3. 选择项目文件夹（免手敲路径）"), /* @__PURE__ */ k("div", {
		class: "chip-selector",
		id: "newTaskProjectChips"
	}), /* @__PURE__ */ k("div", {
		class: "form-label",
		style: "display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;"
	}, /* @__PURE__ */ k("span", null, "4. 任务指令（支持截图或语音）"), /* @__PURE__ */ k("div", { style: "display:inline-flex;align-items:center;gap:6px;" }, /* @__PURE__ */ k("input", {
		type: "file",
		id: "newTaskImageInput",
		accept: "image/*",
		multiple: true,
		style: "display:none;",
		onChange: (e) => window.onChatImageSelected?.(e, "newTask")
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "voice-pill-btn",
		id: "newTaskImageBtn",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.triggerImagePicker?.("newTask");
		}
	}, "🖼️ 传截图"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "voice-pill-btn",
		id: "newTaskVoiceBtn",
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.toggleVoiceInput?.("newTaskInput", "newTaskVoiceBtn");
		}
	}, "🎤 语音输入"))), /* @__PURE__ */ k("div", {
		class: "chip-selector",
		style: "margin-bottom:6px;"
	}, /* @__PURE__ */ k("button", {
		type: "button",
		class: "choice-chip",
		onClick: () => window.fillQuickPrompt?.("帮我检查当前项目的定时任务和运行日志是否正常")
	}, "🔍 检查运行状态"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "choice-chip",
		onClick: () => window.fillQuickPrompt?.("运行单元测试并修复所有报错")
	}, "🧪 跑测试修 Bug"), /* @__PURE__ */ k("button", {
		type: "button",
		class: "choice-chip",
		onClick: () => window.fillQuickPrompt?.("查看 git status 并总结最近的代码改动")
	}, "📦 总结代码改动")), /* @__PURE__ */ k("div", {
		class: "composer-attachments-strip",
		id: "newTaskAttachmentsStrip",
		style: "display:none;margin-bottom:8px;border:1px solid var(--border);border-radius:12px;"
	}), /* @__PURE__ */ k("textarea", {
		class: "new-task-textarea",
		id: "newTaskInput",
		placeholder: "输入你想让电脑执行的任务，或点击右上角🖼️传截图...",
		autocorrect: "on",
		autocapitalize: "sentences",
		spellcheck: true,
		onPaste: (e) => window.onComposerPaste?.(e, "newTask")
	}), /* @__PURE__ */ k("button", {
		type: "button",
		class: "primary-block-btn",
		onClick: () => window.submitNewTask?.()
	}, "🚀 立即在电脑上启动任务"))), /* @__PURE__ */ k("div", {
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
		style: "padding-left:0;padding-right:0;padding-bottom:0;height:82dvh;display:flex;flex-direction:column;"
	}, /* @__PURE__ */ k("div", { class: "sheet-handle" }), /* @__PURE__ */ k("div", {
		class: "sheet-title",
		style: "padding:0 16px 8px;margin:0;border-bottom:1px solid var(--border);"
	}, /* @__PURE__ */ k("span", { id: "inChatFileTitle" }, "📂 当前项目文件速览"), /* @__PURE__ */ k("button", {
		type: "button",
		style: "border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;",
		onClick: () => window.closeMobileFile?.()
	}, "✕")), /* @__PURE__ */ k("div", {
		id: "inChatFileBody",
		style: "flex:1;overflow-y:auto;"
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
	}, "关闭")))));
}
// hub/web/src/App.tsx
function App() {
	return /* @__PURE__ */ k(M, null, /* @__PURE__ */ k("div", {
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
	}, "🔓 解锁进入总控台"))), /* @__PURE__ */ k("div", { class: "app-shell" }, /* @__PURE__ */ k("div", { class: "primary-pane" }, /* @__PURE__ */ k(TopBar, null), /* @__PURE__ */ k("main", {
		class: "main-viewport",
		id: "mainViewport"
	}), /* @__PURE__ */ k(BottomTabs, null)), /* @__PURE__ */ k(ChatStage, null), /* @__PURE__ */ k(Sheets, null), /* @__PURE__ */ k("button", {
		type: "button",
		id: "scrollBottomBtn",
		style: "display:none;",
		onClick: () => window.scrollToChatBottom?.()
	}, "⬇️ 最新消息")));
}
// hub/web/src/utils/format.ts
function esc(str) {
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
	let safe = esc(rawLine);
	const htmlBits = [];
	const stash = (html) => {
		htmlBits.push(html);
		return `\u0000PH${htmlBits.length - 1}\u0000`;
	};
	safe = safe.replace(/`([^`\n]+)`/g, (_m, code) => stash(`<code>${code}</code>`));
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
		out.push(`<${list.type}>${itemsHtml}</${list.type}>`);
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
		const olItem = /^\s{0,3}\d+[.)]\s+(.*)$/.exec(line);
		if (ulItem || olItem) {
			flushParagraph();
			flushQuote();
			const type = ulItem ? "ul" : "ol";
			let item = (ulItem || olItem)[1];
			const task = /^\[( |x|X)\]\s+(.*)$/.exec(item);
			if (task) item = `${task[1].toLowerCase() === "x" ? "☑" : "☐"} ${task[2]}`;
			if (!list || list.type !== type) {
				flushList();
				list = {
					type,
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
		chunks.push(`<div class="code-card"><div class="code-card-header"><span>${esc(lang)}</span><button class="code-copy-btn" onclick="copyCodeText('${encoded}')">📋 复制</button></div><pre>${esc(code)}</pre></div>`);
		cursor = fence.lastIndex;
	}
	if (cursor < text.length) chunks.push(renderMarkdownBlocks(text.slice(cursor)));
	return chunks.join("");
}
function formatAssistantText(rawText) {
	return renderMarkdown(rawText);
}
// hub/web/src/utils/filePreview.ts
function previewKind(preview) {
	if (!preview) return "none";
	if (preview.kind === "image" && (preview.dataBase64 || preview.previewUrl || preview.hasBlob)) return "image";
	if (preview.kind === "binary") return "binary";
	return "text";
}
function imagePreviewSrc(preview) {
	if (preview.dataBase64) return `data:${preview.mime || "image/png"};base64,${preview.dataBase64}`;
	if (preview.previewUrl) {
		let tk = "";
		try {
			tk = localStorage.getItem("dsh_hub_token") || "";
		} catch {}
		const sep = preview.previewUrl.includes("?") ? "&" : "?";
		return tk ? `${preview.previewUrl}${sep}token=${encodeURIComponent(tk)}` : preview.previewUrl;
	}
	return "";
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
    <div>${esc(text)}</div>
  </div>`;
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
var voiceWatchdogTimer = null;
function setVoiceBtnRecording(btnId, recording) {
	const btn = document.getElementById(btnId);
	if (!btn) return;
	btn.classList.toggle("recording", Boolean(recording));
	btn.setAttribute("aria-pressed", recording ? "true" : "false");
	if (btn.classList.contains("voice-pill-btn")) btn.textContent = recording ? "⏹ 停止听写" : "🎤 语音输入";
	else btn.textContent = recording ? "⏹" : "🎤";
}
function isVoiceRecording() {
	return Boolean(activeVoiceRecognition || activeVoiceBtnId);
}
function stopVoiceInput() {
	if (voiceWatchdogTimer) {
		clearTimeout(voiceWatchdogTimer);
		voiceWatchdogTimer = null;
	}
	const rec = activeVoiceRecognition;
	const btnId = activeVoiceBtnId;
	activeVoiceRecognition = null;
	activeVoiceInputId = "";
	activeVoiceBtnId = "";
	if (btnId) setVoiceBtnRecording(btnId, false);
	setVoiceBtnRecording("chatVoiceBtn", false);
	setVoiceBtnRecording("newTaskVoiceBtn", false);
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
function toggleVoiceInput(targetInputId = "globalPromptInput", btnId = "chatVoiceBtn", deps) {
	const showToast = deps?.showToast || (window.showToast ?? (() => {}));
	const onComposerInput = deps?.onComposerInput || (window.onComposerInput ?? (() => {}));
	const btn = document.getElementById(btnId);
	if (activeVoiceRecognition && activeVoiceInputId === targetInputId || btn?.classList.contains("recording")) {
		stopVoiceInput();
		showToast("⏹ 已关闭语音输入");
		return;
	}
	if (activeVoiceRecognition) stopVoiceInput();
	const input = document.getElementById(targetInputId);
	if (!input) return;
	const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
	if (!SpeechRecognitionCtor) {
		input.focus();
		showToast("🎙️ 已唤起输入法，请点手机键盘右下角「🎤 麦克风」直接语音输入");
		return;
	}
	try {
		const recognition = new SpeechRecognitionCtor();
		recognition.lang = navigator.language && navigator.language.startsWith("zh") ? navigator.language : "zh-CN";
		recognition.interimResults = true;
		recognition.continuous = false;
		recognition.maxAlternatives = 1;
		const baseText = input.value || "";
		let finalTranscript = "";
		activeVoiceRecognition = recognition;
		activeVoiceInputId = targetInputId;
		activeVoiceBtnId = btnId;
		setVoiceBtnRecording(btnId, true);
		showToast("🎙️ 正在听写，再点一次「⏹」立即关闭");
		voiceWatchdogTimer = setTimeout(() => {
			if (activeVoiceRecognition === recognition) stopVoiceInput();
		}, 6e4);
		recognition.onresult = (event) => {
			if (activeVoiceRecognition !== recognition) return;
			let interim = "";
			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				const seg = event.results[i][0]?.transcript || "";
				if (event.results[i].isFinal) finalTranscript += seg;
				else interim += seg;
			}
			input.value = baseText + finalTranscript + interim;
			if (targetInputId === "globalPromptInput") onComposerInput();
		};
		recognition.onerror = (event) => {
			const errCode = event?.error || "";
			stopVoiceInput();
			if (errCode === "not-allowed" || errCode === "service-not-allowed") {
				input.focus();
				showToast("🎙️ 未授予浏览器麦克风权限，可直接点手机键盘右下角「🎤」语音输入");
			} else if (errCode && errCode !== "aborted" && errCode !== "no-speech") showToast("⚠️ 语音识别已停止：" + errCode);
		};
		recognition.onend = () => {
			if (activeVoiceRecognition === recognition) stopVoiceInput();
			if (targetInputId === "globalPromptInput") onComposerInput();
		};
		recognition.start();
	} catch {
		stopVoiceInput();
		input.focus();
		showToast("🎙️ 已聚焦输入框，请使用键盘右下角「🎤 麦克风」语音输入");
	}
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
	"✅ 已复制全文": "✅ Copied",
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
	"恢复接入": "Restore Access",
	"🚫 吊销凭证": "🚫 Revoke Token",
	"各后端功能边界（诚实矩阵）": "Supported AI Tools & Capability Matrix",
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
	"🛠️ 检查 git status 并跑测试": "🛠️ Check git status & run tests",
	"📦 总结最近一次 commit 改动": "📦 Summarize latest commit changes",
	"🔍 排查当前目录报错日志": "🔍 Diagnose errors in current project",
	"描述你要让远程 AI 执行的开发任务（可点上方上传截图）...": "Describe the coding task for your remote AI agent (you can also attach screenshots)...",
	"🚀 立即在远程电脑启动": "🚀 Launch on Remote Computer",
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
	"⚠️ 再次点击确认彻底删除": "⚠️ Tap Again to Confirm Delete"
};
var REGEX_ZH_TO_EN = [
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
	[/^DSH 远控总控台 v(.+) · 构建 $/, "DSH Remote Control Hub v$1 · Build "],
	[/^ · 云端启动于 (.+)$/, " · Started $1"],
	[/^刚刚$/, "just now"],
	[/^(\d+)\s*秒前$/, "$1s ago"],
	[/^(\d+)\s*分钟前$/, "$1m ago"],
	[/^(\d+)\s*小时前$/, "$1h ago"],
	[/^(\d+)\s*天前$/, "$1d ago"]
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
		["🔵 看会话/发指令", "🔵 View & Prompt"],
		["👀 观察模式", "👀 Observe-only"],
		["⚪ 未安装", "⚪ Not installed"],
		["🔓 解锁成功", "🔓 Unlocked"],
		["🔓 扫码登录成功", "🔓 QR login successful"],
		["🔓 配对解锁成功", "🔓 Paired & unlocked"],
		["🔒 已锁定当前浏览器", "🔒 Browser locked"],
		["📋 已复制到剪贴板", "📋 Copied to clipboard"],
		["📋 手机免密登录链接已复制", "📋 Direct phone login link copied"],
		["📋 一行接入命令已复制！到电脑终端粘贴回车即可", "📋 1-line command copied! Paste and run in your terminal"],
		["📋 本地仓库接入命令已复制", "📋 Local repo command copied"]
	]) if (out.includes(zhSub)) out = out.split(zhSub).join(enSub);
	return out;
}
function applyLangToDom(root = typeof document !== "undefined" ? document.body : null, lang = getLangPref()) {
	if (!root || typeof document === "undefined") return;
	const isEn = lang === "en";
	if (document.documentElement) document.documentElement.setAttribute("lang", isEn ? "en" : "zh-CN");
	document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
		btn.textContent = isEn ? "🌐 中文" : "🌐 EN";
		btn.setAttribute("title", isEn ? "Switch to Chinese (切换中文)" : "Switch to English");
	});
	root.querySelectorAll("[placeholder], [title]").forEach((el) => {
		if (el.hasAttribute("placeholder")) {
			const cur = el.getAttribute("placeholder") || "";
			if (el.dataset.origPlaceholder === void 0) el.dataset.origPlaceholder = cur;
			const orig = el.dataset.origPlaceholder;
			const target = isEn ? translateZhStringToEn(orig) : orig;
			if (cur !== target) el.setAttribute("placeholder", target);
		}
		if (el.hasAttribute("title") && !el.hasAttribute("data-lang-toggle")) {
			const cur = el.getAttribute("title") || "";
			if (el.dataset.origTitle === void 0) el.dataset.origTitle = cur;
			const orig = el.dataset.origTitle;
			const target = isEn ? translateZhStringToEn(orig) : orig;
			if (cur !== target) el.setAttribute("title", target);
		}
	});
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
	let node = walker.nextNode();
	while (node) {
		const parentTag = node.parentElement?.tagName;
		if (parentTag !== "SCRIPT" && parentTag !== "STYLE" && parentTag !== "CODE" && parentTag !== "PRE") {
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
// hub/web/src/controller.js
function initHubController() {
	const urlParams = new URLSearchParams(location.search);
	const queryToken = (urlParams.get("token") || "").trim();
	const queryPairCode = (urlParams.get("pair") || "").trim();
	let pendingDeepLinkHostId = (urlParams.get("host") || "").trim();
	let pendingDeepLinkTaskId = (urlParams.get("task") || urlParams.get("session") || "").trim();
	if (queryToken || queryPairCode || pendingDeepLinkHostId || pendingDeepLinkTaskId) {
		if (queryToken) localStorage.setItem("dsh_hub_token", queryToken);
		urlParams.delete("token");
		urlParams.delete("pair");
		urlParams.delete("host");
		urlParams.delete("task");
		urlParams.delete("session");
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
	async function apiFetch(path, options = {}) {
		const res = await fetch(path, {
			...options,
			headers: authHeaders(options.headers || {})
		});
		if (res.status === 401) {
			document.getElementById("authOverlay").classList.add("show");
			throw new Error("Unauthorized");
		}
		document.getElementById("authOverlay").classList.remove("show");
		return res;
	}
	async function submitAuthLogin() {
		const inputEl = document.getElementById("authTokenInput");
		const raw = inputEl.value.trim();
		if (!raw) return;
		if (/^[A-Z0-9]{6}$/i.test(raw)) try {
			const exRes = await fetch("/api/pairing/exchange", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ code: raw.toUpperCase() })
			});
			const exData = await exRes.json();
			if (exRes.ok && exData.token) {
				localStorage.setItem("dsh_hub_token", exData.token);
				const paired = await fetchState();
				if (!paired.ok) {
					showToast("❌ 配对成功但读取数据失败：" + (paired.error || "请重试"));
					return;
				}
				document.getElementById("authOverlay").classList.remove("show");
				showToast("🔓 配对解锁成功");
				connectSSE();
				return;
			}
		} catch {}
		localStorage.setItem("dsh_hub_token", raw);
		const state = await fetchState();
		if (!state.ok) {
			if (state.unauthorized) {
				localStorage.removeItem("dsh_hub_token");
				showToast("❌ 访问密码或配对码不正确，请重试");
				document.getElementById("authOverlay").classList.add("show");
				try {
					inputEl.select();
				} catch {}
			} else showToast("❌ 无法连接总控台：" + (state.error || "网络异常"));
			return;
		}
		document.getElementById("authOverlay").classList.remove("show");
		showToast("🔓 解锁成功");
		connectSSE();
	}
	function lockAndLogout() {
		localStorage.removeItem("dsh_hub_token");
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
		el.textContent = langPref === "en" ? translateZhStringToEn(String(msg || "")) : msg;
		el.classList.add("show");
		clearTimeout(window.__toastTimer);
		window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
	}
	const expandedTranscriptBySession = /* @__PURE__ */ new Map();
	function getNormalizedSessions() {
		const list = [];
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
				const ts = t.updatedAt || t.lastActivity || 0;
				const pendingApp = approvals.find((a) => a.agentId === t.id);
				const wireTranscript = Array.isArray(t.transcript) ? [...t.transcript] : [];
				const expandedEntry = expandedTranscriptBySession.get(t.id);
				let baseTranscript = wireTranscript;
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
				const isHostOnlineNow = h.online !== false && h.activelyConnected !== false;
				const queuedCmds = pendingPromptCmds.filter((c) => c.queued || !isHostOnlineNow);
				const dispatchingCmds = pendingPromptCmds.filter((c) => !c.queued && isHostOnlineNow);
				const expiredCmds = (h.recentResults || []).filter((r) => r && r.expired && (r.type === "prompt" || r.type === "steer") && r.agentId === t.id && r.text);
				const optimisticList = window.__dshOptimisticMsgs && window.__dshOptimisticMsgs[t.id] || [];
				const nowMs = Date.now();
				const remainingOpt = [];
				for (const opt of optimisticList) {
					if (nowMs - opt.time >= 15e3) continue;
					if (baseTranscript.some((m) => m.role === "user" && m.text === opt.text) || pendingPromptCmds.some((c) => c.text === opt.text) || expiredCmds.some((ec) => ec.text === opt.text)) continue;
					remainingOpt.push(opt);
					baseTranscript.push({
						role: "user",
						text: opt.text,
						time: opt.time
					});
				}
				for (const dc of dispatchingCmds) if (!baseTranscript.some((m) => m.role === "user" && m.text === dc.text)) baseTranscript.push({
					role: "user",
					text: dc.text,
					time: dc.createdAt || nowMs
				});
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
				if (window.__dshOptimisticMsgs && window.__dshOptimisticMsgs[t.id]) window.__dshOptimisticMsgs[t.id] = remainingOpt;
				const transcript = baseTranscript;
				const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;
				const project = t.project || (t.cwd ? t.cwd.split("/").filter(Boolean).pop() : "默认工作区") || "默认工作区";
				const status = pendingApp ? "approval" : t.status === "running" || dispatchingCmds.length > 0 ? "running" : t.status || "idle";
				const queuedCount = queuedCmds.length;
				const rawIdStr = String(t.id || "");
				const harness = t.harness || (rawIdStr.startsWith("agy-ide:") ? "antigravity-ide" : rawIdStr.startsWith("codex:") ? "codex" : rawIdStr.startsWith("claude:") ? "claude" : "dsh");
				const harnessLabel = t.harnessLabel || (harness === "antigravity-ide" ? "Antigravity IDE" : harness === "codex" ? "Codex" : harness === "claude" ? "Claude Code" : "DeepSeek Harness");
				let lastConclusionAt = Number(t.lastConclusionAt) || 0;
				if (!lastConclusionAt && status === "idle" && lastMsg?.role === "assistant" && Boolean(lastMsg?.text)) lastConclusionAt = ts;
				const lastInterruptedAt = Number(t.lastInterruptedAt) || 0;
				const turnState = status === "approval" ? "approval" : status === "running" ? "running" : t.turnState === "interrupted" ? "interrupted" : t.turnState === "conclusion" || lastConclusionAt > 0 ? "conclusion" : "idle";
				const rawPreview = status === "running" ? t.runningSummary || t.lastOutput || lastMsg?.text || "正在思考与执行任务..." : status === "approval" ? pendingApp?.promptTitle || pendingApp?.reason || t.lastOutput || "等待你批准工具执行" : t.lastOutput || lastMsg?.text || t.cwd || "点击查看对话详情";
				const changedFiles = Array.isArray(t.changedFiles) ? t.changedFiles : Array.isArray(pendingApp?.changedFiles) ? pendingApp.changedFiles : [];
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
					transcript
				});
			}
		}
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
		const statePriority = (s) => {
			if (s.status === "approval") return 4;
			if (s.status === "running") return 3;
			if (s.hasUnreadConclusion || s.isUnreadInterrupted) return 2;
			if (s.pinned) return 1;
			return 0;
		};
		return list.sort((a, b) => {
			const pa = statePriority(a);
			const pb = statePriority(b);
			if (pa !== pb) return pb - pa;
			return (b.updatedAt || 0) - (a.updatedAt || 0);
		});
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
		if (hosts.length === 0) {
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
		applyLangToDom(document.body, langPref);
	}
	function renderProjectStrip(sessionsArg) {
		const sessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
		const activeCount = sessions.filter((s) => s.status === "running" || s.status === "approval").length;
		const unreadCount = sessions.filter((s) => s.hasUnreadConclusion || s.isUnreadInterrupted).length;
		const agyCount = sessions.filter((s) => s.harness === "antigravity-ide").length;
		const codexCount = sessions.filter((s) => s.harness === "codex").length;
		const claudeCount = sessions.filter((s) => s.harness === "claude").length;
		const dshCount = sessions.filter((s) => s.harness === "dsh").length;
		const counts = {};
		for (const s of sessions) counts[s.project] = (counts[s.project] || 0) + 1;
		const projects = Object.keys(counts);
		const strip = document.getElementById("projectStrip");
		const stripKey = `${currentProject}:${sessions.length}:${activeCount}:${unreadCount}:${agyCount}:${codexCount}:${claudeCount}:${dshCount}:${projects.map((p) => `${p}:${counts[p]}`).join(",")}`;
		if (stripKey === lastRenderedStripKey && strip.children.length > 0) return;
		lastRenderedStripKey = stripKey;
		const prevScrollLeft = strip.scrollLeft;
		const smartPills = [`<button class="filter-pill smart-pill ${currentProject === "SMART_ACTIVE" ? "active" : ""}" onclick="selectProject('SMART_ACTIVE')">🟢 运行中 <span class="count">${activeCount}</span></button>`, `<button class="filter-pill smart-pill ${currentProject === "SMART_UNREAD" ? "active" : ""}" onclick="selectProject('SMART_UNREAD')">🔵 已出结论 <span class="count">${unreadCount}</span></button>`];
		if (agyCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_AGY_IDE" ? "active" : ""}" onclick="selectProject('HARNESS_AGY_IDE')">⚡ IDE <span class="count">${agyCount}</span></button>`);
		if (codexCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_CODEX" ? "active" : ""}" onclick="selectProject('HARNESS_CODEX')">🧠 Codex <span class="count">${codexCount}</span></button>`);
		if (claudeCount > 0) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_CLAUDE" ? "active" : ""}" onclick="selectProject('HARNESS_CLAUDE')">✴️ Claude <span class="count">${claudeCount}</span></button>`);
		if (dshCount > 0 && (agyCount > 0 || codexCount > 0 || claudeCount > 0)) smartPills.push(`<button class="filter-pill smart-pill ${currentProject === "HARNESS_DSH" ? "active" : ""}" onclick="selectProject('HARNESS_DSH')">🟣 DSH <span class="count">${dshCount}</span></button>`);
		strip.innerHTML = [
			`<button class="filter-pill ${currentProject === "ALL" ? "active" : ""}" onclick="selectProject('ALL')">全部 <span class="count">${sessions.length}</span></button>`,
			...smartPills,
			...projects.map((p) => `<button class="filter-pill ${currentProject === p ? "active" : ""}" onclick="selectProject('${esc(p)}')">${esc(p)} <span class="count">${counts[p]}</span></button>`)
		].join("");
		strip.scrollLeft = prevScrollLeft;
	}
	function renderSessionList(sessionsArg) {
		const viewport = document.getElementById("mainViewport");
		const allSessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
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
			if (currentProject === "HARNESS_CLAUDE" && s.harness !== "claude") return false;
			if (![
				"ALL",
				"SMART_ACTIVE",
				"SMART_UNREAD",
				"HARNESS_DSH",
				"HARNESS_AGY_IDE",
				"HARNESS_CODEX",
				"HARNESS_CLAUDE"
			].includes(currentProject) && s.project !== currentProject) return false;
			if (!q) return true;
			return s.title.toLowerCase().includes(q) || s.project.toLowerCase().includes(q) || s.lastPreview.toLowerCase().includes(q);
		});
		const showHostTag = currentHostId === "ALL_HOSTS" && (hubState.hosts || []).length > 1;
		const isPendingQuestion = Boolean(pendingAppInfo && (pendingAppInfo.app.kind === "question" || Array.isArray(pendingAppInfo.app.questions)));
		let step6Dismissed = false;
		try {
			step6Dismissed = localStorage.getItem("dsh_step6_qr_dismissed") === "1";
		} catch {}
		const showStep6Banner = (hubState.hosts || []).length > 0 && !step6Dismissed;
		const bannerKey = pendingAppInfo ? `${pendingAppInfo.host.hostId}:${pendingAppInfo.app.code}:${pendingAppInfo.app.kind || ""}:${pendingAppInfo.app.promptTitle || ""}:${pendingAppInfo.app.settling ? 1 : 0}:${pendingAppInfo.app.lastError || ""}` : "";
		const rowsSig = filtered.map((s) => `${s.id}:${s.status}:${s.approvalObj?.kind || ""}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ""}:${s.queuedCount || 0}:${s.hasUnreadConclusion ? 1 : 0}:${s.isUnreadInterrupted ? 1 : 0}:${s.pinned ? 1 : 0}:${s.id === activeSessionId ? 1 : 0}:${s.title}:${s.project}:${s.lastRole}:${s.lastPreview}:${s.timeLabel}`).join("|");
		const enrollSig = `${hubState.enrollment?.code || ""}:${hubState.enrollment?.joinedCount || 0}`;
		const listKey = `${(hubState.hosts || []).length}:${allSessions.length}:${currentProject}:${q}:${showHostTag ? 1 : 0}:${showStep6Banner ? 1 : 0}:${enrollSig}:${bannerKey}#${rowsSig}`;
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
          <div class="live-activity-left" onclick="openChat('${esc(pendingAppInfo.app.agentId)}')">
            <div class="live-activity-title">${isPendingQuestion ? "💬" : "⏳"} [${esc(pendingAppInfo.host.hostName)}] ${esc(pendingAppInfo.app.project ? `${pendingAppInfo.app.project} / ` : "")}${esc(pendingAppInfo.app.settling ? isPendingQuestion ? "正在同步你的选择到电脑端..." : "正在同步审批到电脑端..." : pendingAppInfo.app.title || (isPendingQuestion ? "等待你做出选择" : "等待你批准工具执行"))}</div>
            <div class="live-activity-desc" ${pendingAppInfo.app.lastError ? "style=\"color:#ef4444;font-weight:600;\"" : ""}>${esc(pendingAppInfo.app.lastError ? `⚠️ ${pendingAppInfo.app.lastError}` : pendingAppInfo.app.promptTitle || pendingAppInfo.app.reason || "")}</div>
          </div>
          <div class="live-activity-actions">
            ${pendingAppInfo.app.settling ? `
              <button class="mini-approve-btn" disabled style="opacity:0.65;cursor:not-allowed;">⏳ 处理中...</button>
            ` : isPendingQuestion ? `
              <button class="mini-approve-btn" onclick="openChat('${esc(pendingAppInfo.app.agentId)}')">去选择 ›</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', false, 4, '${esc(pendingAppInfo.app.agentId || "")}')">跳过</button>
            ` : `
              <button class="mini-approve-btn" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', true, 1, '${esc(pendingAppInfo.app.agentId || "")}')">✓ 允许</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', false, 4, '${esc(pendingAppInfo.app.agentId || "")}')">拒绝</button>
            `}
          </div>
        </div>
      ` : "";
		const rowsHtml = filtered.map((s) => {
			let rowStateClass = "";
			let statusHtml = `<span class="session-time">${esc(s.timeLabel)}</span>`;
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
			const hostBadgeHtml = showHostTag ? `<span class="host-mini-tag">${esc(s.hostName)}</span>` : "";
			const harnessTagHtml = s.harness === "antigravity-ide" ? `<span class="harness-mini-tag agy">⚡ IDE</span>` : s.harness === "codex" ? `<span class="harness-mini-tag agy">🧠 Codex</span>` : s.harness === "claude" ? `<span class="harness-mini-tag agy">✴️ Claude</span>` : "";
			const rolePrefix = s.status === "running" ? "" : s.lastRole === "user" ? "🧑 我: " : "🤖 ";
			const displayTitle = s.harness !== "dsh" && s.project && !s.title.startsWith(s.project) ? `${s.project} / ${s.title}` : s.title;
			return `
          <div class="session-row ${rowStateClass} ${s.pinned ? "pinned-row" : ""} ${s.id === activeSessionId ? "selected-desktop" : ""}" onclick="openChat('${esc(s.id)}')">
            <div class="session-main">
              <div class="session-top-line">
                <div class="session-title-wrap">
                  ${pinHtml}
                  <div class="session-title">${esc(displayTitle)}</div>
                </div>
                <div class="session-right-meta">${statusHtml}</div>
              </div>
              <div class="session-sub-line">
                ${hostBadgeHtml}
                ${harnessTagHtml}
                <span class="project-mini-tag">📁 ${esc(s.project)}</span>
                <span class="session-preview-text">${rolePrefix}${esc(s.lastPreview)}</span>
              </div>
            </div>
            <button class="row-more-btn" title="更多操作" onclick="event.stopPropagation(); openSessionActions('${esc(s.id)}')">⋯</button>
          </div>
        `;
		}).join("");
		let emptyStateHtml = "";
		if (!rowsHtml) {
			if ((hubState.hosts || []).length === 0) emptyStateHtml = renderAddHostPanelHtml({ isEmptyState: true });
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
		document.getElementById("chatFullscreen").classList.add("open");
		document.body.classList.add("mobile-chat-open");
		lastRenderedChatKey = "";
		renderActiveChatStage(found);
		const box = document.getElementById("chatMessages");
		if (box && box.scrollHeight - box.scrollTop - box.clientHeight >= 120) setScrollBottomVisible(true);
		if (!document.body.classList.contains("DesktopSplitMode")) {
			trackOverlay("chat", rawCloseChat);
			maybeShowSwipeHint();
		}
		const nextSessions = getNormalizedSessions();
		renderProjectStrip(nextSessions);
		renderSessionList(nextSessions);
	}
	function rawCloseChat() {
		stopVoiceInput();
		document.getElementById("chatFullscreen").classList.remove("open");
		document.body.classList.remove("mobile-chat-open");
		setScrollBottomVisible(false);
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
		const chatHeaderTitle = s.harness !== "dsh" && s.project && !s.title.startsWith(s.project) ? `${s.project} / ${s.title}` : s.title;
		document.getElementById("chatTitle").textContent = chatHeaderTitle;
		const harnessPrefix = s.harness === "antigravity-ide" ? "⚡ Antigravity IDE · " : s.harness === "codex" ? "🧠 Codex · " : s.harness === "claude" ? "✴️ Claude Code · " : "";
		const isObserveOnly = s.controlMode === "observe-only" && s.harness !== "dsh";
		const modeTag = isObserveOnly ? " · 👀 仅观测" : s.controlMode === "idle-resumable" || s.controlMode === "observe-only" && s.harness === "dsh" ? " · 🔵 可续聊" : "";
		document.getElementById("chatSub").textContent = `${harnessPrefix}📁 ${s.project} · 💻 ${s.hostName} (${s.msgCount} 条对话)${modeTag}`;
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
			alertBar.style.display = "flex";
			alertBar.innerHTML = `
          <span>${isOtherQuestion ? "💬" : "⏳"} [${esc(otherApproval.host.hostName)}]「${esc(otherApproval.app.project ? `${otherApproval.app.project} / ` : "")}${esc(otherApproval.app.title || otherApproval.app.toolName)}」${isOtherQuestion ? "待你选择" : "待你审批"}</span>
          <button style="border:none;background:#d97706;color:#fff;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600;cursor:pointer;" onclick="openChat('${esc(otherApproval.app.agentId)}')">立即切换 ›</button>
        `;
		} else alertBar.style.display = "none";
		switchComposerSession(s.id);
		const composerKey = `${s.id}:${s.status}:${s.controlMode || ""}`;
		if (composerKey !== lastRenderedComposerKey) {
			lastRenderedComposerKey = composerKey;
			const runningBar = document.getElementById("runningControlBar");
			const chatInput = document.getElementById("globalPromptInput");
			const sendBtn = document.getElementById("chatSendBtn");
			if (isObserveOnly) {
				runningBar.classList.remove("show");
				chatInput.disabled = true;
				sendBtn.disabled = true;
				sendBtn.style.display = "none";
				chatInput.placeholder = "👀 当前会话为观察模式（仅支持查看对话记录）";
				sendBtn.textContent = "👀 仅观察";
			} else if (s.status === "running") {
				runningBar.classList.add("show");
				if (!(s.capabilities?.canSteer !== false && s.harness !== "codex" && s.harness !== "claude")) {
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
		const trSig = s.transcript.slice(-6).map((m) => `${m.role}:${m.queuedCmdId || ""}:${m.expiredCmdId || ""}:${(m.text || "").length}:${(m.text || "").slice(-32)}:${(m.thinking || "").length}:${(m.tools || []).length}:${m.waitingForInput ? 1 : 0}`).join("|");
		const chatKey = `${s.id}:${s.status}:${s.sessionRev || ""}:${s.transcript.length}:${trSig}:${s.approvalObj?.code || ""}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ""}:${(s.changedFiles || []).length}`;
		if (chatKey === lastRenderedChatKey) return;
		lastRenderedChatKey = chatKey;
		selectedAgyOptionIndex = 1;
		const box = document.getElementById("chatMessages");
		const openDetailIds = new Set(Array.from(box.querySelectorAll("details[open][data-detail-id]")).map((el) => el.dataset.detailId));
		const nearBottom = box.dataset.dshSession !== String(activeSessionId) || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
		const prevScrollTop = box.scrollTop;
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
					prev._stepCount = prev.thinkingStepCount || (prev.thinking ? 1 : 0);
				}
				if (item.thinking && String(item.thinking).trim()) {
					prev._thoughtList.push(String(item.thinking).trim());
					prev._stepCount += item.thinkingStepCount || 1;
				}
				if (item.text && !item.isToolStepOnly && String(item.text).trim()) prev._textList.push(String(item.text).trim());
				const nextTools = Array.isArray(item.toolCalls) && item.toolCalls.length > 0 ? item.toolCalls : item.tools || [];
				for (const t of nextTools) if (t) prev._toolList.push(t);
				prev.thinkingStepCount = prev._stepCount;
				prev.thinking = prev._thoughtList.length <= 1 ? prev._thoughtList[0] || "" : prev._thoughtList.map((th, idx) => th.startsWith("【思考") ? th : `【思考 ${idx + 1}】\n${th}`).join("\n\n");
				prev.text = prev._textList.join("\n\n");
				prev.tools = prev._toolList;
				prev.toolCalls = prev._toolList;
				prev.isToolStepOnly = false;
			} else msgs.push({ ...item });
		}
		lastRenderedAssistantTexts = {};
		const bubblesHtml = msgs.map((m, msgIdx) => {
			if (m.role === "user") {
				const queuedBadge = m.queuedCmdId ? `<div class="queued-cmd-pill"><span>⏳ 排队中（电脑上线后执行）</span><button class="cancel-queued-btn" onclick="event.stopPropagation(); cancelQueuedCommand('${esc(m.queuedCmdId)}')">✕ 取消</button></div>` : m.expiredCmdId ? `<div class="queued-cmd-pill" style="background:rgba(239,68,68,0.18);color:#fecaca;"><span>⚠️ 电脑超过 10 分钟未上线，该指令已超时未执行</span></div>` : "";
				return `<div class="bubble user"><div>${esc(m.text)}</div>${queuedBadge}</div>`;
			}
			const thinkId = `think-${msgIdx}`;
			const stepCountLabel = m.thinkingStepCount > 1 ? ` · 共 ${m.thinkingStepCount} 步` : "";
			const thought = m.thinking ? `<details class="thought-box thinking-details" data-detail-id="${thinkId}" ${openDetailIds.has(thinkId) ? "open" : ""}><summary>💭 思考过程${stepCountLabel} (点击展开)</summary><div style="margin-top:6px;white-space:pre-wrap;">${esc(m.thinking)}</div></details>` : "";
			if (m.isToolStepOnly) {
				const toolOut = (m.tools || []).map((t) => t.commandLine || t.summary || "").filter(Boolean).join("\n");
				const waitText = m.waitingForInput ? `<div style="margin-top:6px;font-size:12.5px;color:var(--muted);">Waiting for user input.</div>` : "";
				const stepToolId = `tool-step-${msgIdx}`;
				return `
            <div class="bubble assistant" style="padding:10px 14px;">
              ${thought}
              <details class="tool-chip-details" data-detail-id="${stepToolId}" ${openDetailIds.has(stepToolId) ? "open" : ""} style="border:none;background:transparent;">
                <summary style="padding:2px 0;font-size:13px;color:var(--text-secondary);">
                  <span>${esc(m.text)}</span>
                  <span style="color:var(--muted);font-size:11px;">›</span>
                </summary>
                ${toolOut ? `<div class="tool-chip-output" style="margin-top:6px;border-radius:6px;">${esc(toolOut)}</div>` : ""}
              </details>
              ${waitText}
            </div>
          `;
			}
			const rawTools = Array.isArray(m.toolCalls) && m.toolCalls.length > 0 ? m.toolCalls : m.tools || [];
			let tools = "";
			if (rawTools.length > 0) {
				const toolItemsHtml = rawTools.map((t, tIdx) => {
					const tName = typeof t === "string" ? t : t.name || "tool";
					const tSummary = typeof t === "string" ? "" : t.summary || t.argsSummary || "";
					const tDetail = typeof t === "string" ? "执行完毕" : t.commandLine || t.output || tSummary || "执行完毕";
					const chipId = `tool-${msgIdx}-${tIdx}`;
					return `
              <details class="tool-chip-details" data-detail-id="${chipId}" ${openDetailIds.has(chipId) ? "open" : ""}>
                <summary><span>🔧 ${esc(tName)}${tSummary ? ` · ${esc(tSummary.slice(0, 64))}` : ""}</span><span style="color:#94a3b8;font-size:10.5px;">点击查看详情 ▾</span></summary>
                <div class="tool-chip-output">${esc(tDetail)}</div>
              </details>
            `;
				}).join("");
				if (rawTools.length > 1) {
					const groupId = `tool-group-${msgIdx}`;
					const uniqueToolNames = [...new Set(rawTools.map((t) => typeof t === "string" ? t : t.name || "tool"))].slice(0, 4).join(", ");
					tools = `<details class="thought-box thinking-details" data-detail-id="${groupId}" ${openDetailIds.has(groupId) ? "open" : ""} style="margin-bottom:8px;"><summary>🔧 执行过程 · 共 ${rawTools.length} 次工具调用 (${esc(uniqueToolNames)}) (点击展开)</summary><div class="tool-chips" style="margin-top:6px;">${toolItemsHtml}</div></details>`;
				} else tools = `<div class="tool-chips" style="margin-bottom:8px;">${toolItemsHtml}</div>`;
			}
			const cleanReplyText = m.text ? String(m.text).trim() : "";
			if (cleanReplyText) lastRenderedAssistantTexts[msgIdx] = cleanReplyText;
			const copyFooterHtml = cleanReplyText ? `<div class="assistant-copy-footer"><span class="assistant-char-meta">共 ${cleanReplyText.length} 字</span><button type="button" class="assistant-copy-btn" onclick="copyAssistantReply(${msgIdx}, this)">📋 一键复制全文</button></div>` : "";
			const bodyHtml = cleanReplyText ? `<div class="md-body">${formatAssistantText(cleanReplyText)}</div>${copyFooterHtml}` : `<div style="font-size:12.5px;color:var(--muted);margin-top:4px;">⚙️ 正在思考与执行工具调用...</div>`;
			return `<div class="bubble assistant">${thought}${tools}${bodyHtml}</div>`;
		}).join("");
		const filesChangedHtml = s.harness === "antigravity-ide" && Array.isArray(s.changedFiles) && s.changedFiles.length > 0 ? `
        <div class="agy-files-changed-card">
          ${s.changedFiles.slice(-8).map((fc) => `
            <div class="agy-file-row">
              <span class="agy-file-dot">◉</span>
              <span class="agy-file-diff"><span class="add">+${Number(fc.added || 0)}</span><span class="del">-${Number(fc.removed || 0)}</span></span>
              <span class="agy-file-name">${esc(fc.name || "")}</span>
              <span class="agy-file-path">${esc(fc.displayPath || fc.path || "")}</span>
            </div>
          `).join("")}
          <div class="agy-files-footer">
            <span>📄 ${s.changedFiles.length} Files With Changes ⌃</span>
            <div class="agy-files-footer-btns">
              <button class="agy-files-reject" onclick="openInChatFileDrawer()">查看改动</button>
              <button class="agy-files-accept" onclick="openInChatFileDrawer()">Accept all</button>
            </div>
          </div>
        </div>
      ` : "";
		const isQuestionApproval = Boolean(s.approvalObj && (s.approvalObj.kind === "question" || Array.isArray(s.approvalObj.questions)));
		const isAgyApproval = s.approvalObj && !isQuestionApproval && (s.approvalObj.harness === "antigravity-ide" || Array.isArray(s.approvalObj.options));
		const approvalStatusNoticeHtml = s.approvalObj?.lastError ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.35);color:#ef4444;font-size:12px;font-weight:600;">⚠️ ${esc(s.approvalObj.lastError)}</div>` : s.approvalObj?.settling ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:var(--amber-soft);color:#d97706;font-size:12px;font-weight:600;">⏳ 正在同步到电脑端执行（最长等待 45 秒）...</div>` : "";
		const qDraft = isQuestionApproval ? getDshQuestionDraft(s.approvalObj.code, s.approvalObj.questions) : null;
		const approvalCardHtml = s.approvalObj ? isQuestionApproval ? `
        <div class="dsh-question-card" data-question-code="${esc(s.approvalObj.code)}">
          <div class="dsh-question-card-header">
            <span class="dsh-question-badge-icon">💬</span>
            <div class="dsh-question-card-title">${esc(s.approvalObj.promptTitle || "请做出选择以继续")}</div>
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
			const detailId = `q-detail-${esc(s.approvalObj.code)}-${qIdx}`;
			return `
                <div class="dsh-question-block" data-question-id="${esc(qId)}">
                  <div class="dsh-question-prompt-line">
                    ${q.header ? `<span class="dsh-question-header-pill">${esc(q.header)}</span>` : ""}
                    <span class="dsh-question-prompt-text">${esc(q.question || q.header || "请选择一项")}</span>
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
                          data-q-id="${esc(qId)}"
                          data-opt-label="${esc(label)}"
                          ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="toggleDshQuestionOption('${esc(s.approvalObj.code)}', '${esc(qId)}', '${esc(label)}', ${Boolean(q.multiSelect)})"`}
                        >
                          <div class="dsh-question-opt-top">
                            <span class="dsh-question-opt-check">${q.multiSelect ? isSel ? "☑" : "☐" : isSel ? "◉" : "○"}</span>
                            <span class="dsh-question-opt-label">${esc(label)}</span>
                          </div>
                          ${opt.description ? `<div class="dsh-question-opt-desc">${esc(opt.description)}</div>` : ""}
                        </button>
                      `;
			}).join("")}
                  </div>
                  <div class="dsh-question-custom-wrap">
                    <input
                      type="text"
                      class="dsh-question-custom-input"
                      data-q-id="${esc(qId)}"
                      placeholder="或者直接输入自定义回答 / 补充说明..."
                      value="${esc(draftItem.customText || "")}"
                      ${s.approvalObj.settling ? "disabled" : `oninput="onDshQuestionCustomInput('${esc(s.approvalObj.code)}', '${esc(qId)}', this.value)"`}
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
              ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4, '${esc(s.id)}')"`}
            >跳过 / 取消</button>
            <button
              type="button"
              class="dsh-question-btn-submit"
              ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="submitDshQuestionAnswers('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', '${esc(s.id)}')"`}
            >${s.approvalObj.settling ? "⏳ 正在提交..." : "提交选择 ↵"}</button>
          </div>
        </div>
      ` : isAgyApproval ? `
        <div class="agy-approval-card">
          <div class="agy-approval-header">
            <span class="agy-approval-term-icon">&gt;_</span>
            <span>${esc(s.approvalObj.promptTitle || `Allow ${s.approvalObj.toolName}?`)}</span>
          </div>
          <div class="agy-approval-subtitle">${esc(s.approvalObj.subtitle || "the auto-run safety check did not reach a decision")}</div>
          ${s.approvalObj.commandLine ? `<div class="agy-approval-cmd">${esc(s.approvalObj.commandLine)}</div>` : `<div class="agy-approval-cmd">${esc(s.approvalObj.reason || "")}</div>`}
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
              <button type="button" class="agy-approval-opt ${opt.index === 1 ? "selected" : ""}" data-opt-idx="${opt.index}" ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="selectAgyApprovalOption(${opt.index})" ondblclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', ${opt.index !== 4}, ${opt.index})"`}>
                <span class="agy-opt-num">${opt.index}</span>
                <span>${esc(opt.label)}</span>
              </button>
            `).join("")}
          </div>
          <div class="agy-approval-footer">
            <button type="button" class="agy-btn-skip" ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4)"`}>Skip</button>
            <button type="button" class="agy-btn-submit" ${s.approvalObj.settling ? "disabled style=\"opacity:0.6;cursor:not-allowed;\"" : `onclick="submitAgyApproval('${esc(s.hostId)}', '${esc(s.approvalObj.code)}')"`}>${s.approvalObj.settling ? "⏳ 处理中..." : "Submit <span>↵</span>"}</button>
          </div>
        </div>
      ` : `
        <div class="inline-approval-card">
          <div class="inline-approval-title">⏳ 等待你确认工具调用：${esc(s.approvalObj.toolName)}</div>
          <div class="inline-approval-cmd">${esc(s.approvalObj.reason || "请求执行权限")}</div>
          ${approvalStatusNoticeHtml}
          <div class="inline-approval-btns">
            <button style="background:#10b981;color:#fff;${s.approvalObj.settling ? "opacity:0.6;cursor:not-allowed;" : ""}" ${s.approvalObj.settling ? "disabled" : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', true, 1)"`}>${s.approvalObj.settling ? "⏳ 正在同步..." : "✅ 允许执行"}</button>
            <button style="background:#fee2e2;color:#dc2626;${s.approvalObj.settling ? "opacity:0.6;cursor:not-allowed;" : ""}" ${s.approvalObj.settling ? "disabled" : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4)"`}>✕ 拒绝</button>
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
		].map((f) => `<button class="followup-pill" onclick="sendQuickFollowup('${esc(f)}')">${esc(f)}</button>`).join("")}
        </div>
      `;
		const loadEarlierHtml = s.omittedTranscriptCount > 0 ? `
          <div style="display:flex;justify-content:center;margin:4px 0 10px;">
            <button
              type="button"
              class="followup-pill"
              style="font-size:12px;padding:6px 14px;"
              onclick="loadEarlierTranscript('${esc(s.hostId)}', '${esc(s.id)}', this)"
            >⬆️ 为保证秒开已省略前 ${s.omittedTranscriptCount} 条早先记录 · 点击加载完整历史</button>
          </div>
        ` : expandedTranscriptBySession.has(s.id) ? `<div style="text-align:center;font-size:11.5px;color:var(--muted);margin:4px 0 10px;">✅ 已加载全部历史对话（共 ${s.transcript.length} 条）</div>` : "";
		const sessionChanged = lastRenderedChatSessionId !== s.id;
		box.innerHTML = loadEarlierHtml + bubblesHtml + filesChangedHtml + approvalCardHtml + followupsHtml;
		if (sessionChanged || nearBottom) {
			box.scrollTop = box.scrollHeight;
			setScrollBottomVisible(false);
		} else {
			box.scrollTop = prevScrollTop;
			setScrollBottomVisible(true);
		}
		lastRenderedChatSessionId = s.id;
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
		const box = document.getElementById("chatMessages");
		if (box) {
			if (typeof box.scrollTo === "function") box.scrollTo({
				top: box.scrollHeight,
				behavior: "smooth"
			});
			else box.scrollTop = box.scrollHeight;
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
		box.addEventListener("scroll", () => {
			if (box.scrollHeight - box.scrollTop - box.clientHeight < 40) setScrollBottomVisible(false);
		}, { passive: true });
	}
	async function dispatchHostCommand(hostId, payload) {
		return (await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/command`, {
			method: "POST",
			body: JSON.stringify(payload)
		})).json();
	}
	let composerSessionId = "";
	let composerDraftTimer = null;
	function composerDraftKey(sessionId) {
		return "dsh_draft_v1_" + sessionId;
	}
	function readComposerDraft(sessionId) {
		if (!sessionId) return "";
		try {
			return localStorage.getItem(composerDraftKey(sessionId)) || "";
		} catch {
			return "";
		}
	}
	function persistComposerDraft(sessionId = composerSessionId) {
		if (!sessionId) return;
		const input = document.getElementById("globalPromptInput");
		if (!input) return;
		try {
			if (input.value.trim()) localStorage.setItem(composerDraftKey(sessionId), input.value);
			else localStorage.removeItem(composerDraftKey(sessionId));
		} catch {}
	}
	function autoGrowComposer() {
		const input = document.getElementById("globalPromptInput");
		if (!input || input.tagName !== "TEXTAREA") return;
		input.style.height = "auto";
		const fullHeight = input.scrollHeight || 24;
		input.style.height = Math.min(fullHeight, 132) + "px";
		input.style.overflowY = fullHeight > 132 ? "auto" : "hidden";
	}
	function onComposerInput() {
		autoGrowComposer();
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
		if (composerSessionId) persistComposerDraft(composerSessionId);
		composerSessionId = nextSessionId || "";
		input.value = readComposerDraft(composerSessionId);
		input.style.height = "";
		autoGrowComposer();
		renderAttachmentStrip("chat");
	}
	const MAX_COMPOSER_ATTACHMENTS = 4;
	const composerAttachments = {
		chat: [],
		newTask: []
	};
	function getAttachmentList(target = "chat") {
		return target === "newTask" ? composerAttachments.newTask : composerAttachments.chat;
	}
	function triggerImagePicker(target = "chat") {
		const inputId = target === "newTask" ? "newTaskImageInput" : "chatImageInput";
		const el = document.getElementById(inputId);
		if (el) {
			el.value = "";
			el.click();
		}
	}
	function readFileAsDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(/* @__PURE__ */ new Error("读取图片失败"));
			reader.readAsDataURL(file);
		});
	}
	async function compressImageFile(file) {
		const rawDataUrl = await readFileAsDataUrl(file);
		const commaIdx = rawDataUrl.indexOf(",");
		const rawBase64 = commaIdx >= 0 ? rawDataUrl.slice(commaIdx + 1) : rawDataUrl;
		const origMime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
		const origName = file.name || `screenshot-${Date.now()}.jpg`;
		try {
			const img = await new Promise((resolve, reject) => {
				const el = new Image();
				el.onload = () => resolve(el);
				el.onerror = () => reject(/* @__PURE__ */ new Error("Image decode failed"));
				el.src = rawDataUrl;
			});
			const w = img.naturalWidth || img.width || 0;
			const h = img.naturalHeight || img.height || 0;
			const maxSide = 1600;
			const needsResize = w > maxSide || h > maxSide;
			const needsCompress = file.size > 266240;
			if (!needsResize && !needsCompress && w > 0 && h > 0) return {
				name: origName,
				mimeType: origMime,
				dataBase64: rawBase64,
				previewUrl: rawDataUrl,
				sizeBytes: file.size || Math.round(rawBase64.length * 3 / 4),
				width: w,
				height: h
			};
			if (w > 0 && h > 0) {
				const scale = needsResize ? Math.min(maxSide / w, maxSide / h) : 1;
				const targetW = Math.max(1, Math.round(w * scale));
				const targetH = Math.max(1, Math.round(h * scale));
				const canvas = document.createElement("canvas");
				canvas.width = targetW;
				canvas.height = targetH;
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.fillStyle = "#ffffff";
					ctx.fillRect(0, 0, targetW, targetH);
					ctx.drawImage(img, 0, 0, targetW, targetH);
					const outMime = "image/jpeg";
					const outDataUrl = canvas.toDataURL(outMime, .82);
					const outComma = outDataUrl.indexOf(",");
					const outBase64 = outComma >= 0 ? outDataUrl.slice(outComma + 1) : outDataUrl;
					return {
						name: `${origName.replace(/\.[a-zA-Z0-9]+$/, "") || "screenshot"}.jpg`,
						mimeType: outMime,
						dataBase64: outBase64,
						previewUrl: outDataUrl,
						sizeBytes: Math.round(outBase64.length * 3 / 4),
						width: targetW,
						height: targetH
					};
				}
			}
		} catch {}
		return {
			name: origName,
			mimeType: origMime,
			dataBase64: rawBase64,
			previewUrl: rawDataUrl,
			sizeBytes: file.size || Math.round(rawBase64.length * 3 / 4)
		};
	}
	function renderAttachmentStrip(target = "chat") {
		const stripId = target === "newTask" ? "newTaskAttachmentsStrip" : "composerAttachmentsStrip";
		const strip = document.getElementById(stripId);
		if (!strip) return;
		const list = getAttachmentList(target);
		if (!list.length || target === "chat" && desktopStageMode === "code") {
			strip.style.display = "none";
			strip.innerHTML = "";
			return;
		}
		strip.style.display = "flex";
		strip.innerHTML = list.map((item, idx) => `
        <div class="attachment-thumb-item">
          <img class="attachment-thumb-img" src="${esc(item.previewUrl)}" alt="${esc(item.name)}" />
          <span class="attachment-thumb-meta">${esc(formatBytes(item.sizeBytes || 0))}</span>
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
		renderAttachmentStrip(target);
		if (addedCount > 0) showToast(`🖼️ 已添加 ${addedCount} 张截图（已自动优化至 ${formatBytes(totalSize)}）`);
	}
	async function onChatImageSelected(event, target = "chat") {
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
			if (data?.ok) showToast("🗑️ 已取消排队中的指令");
			else showToast("⚠️ " + (data?.error || "该指令已执行或不存在"));
		} catch (err) {
			showToast("❌ 取消失败：" + (err?.message || err));
		}
		fetchState();
	}
	async function sendPromptToActiveSession() {
		stopVoiceInput();
		const input = document.getElementById("globalPromptInput");
		const rawText = input ? input.value.trim() : "";
		const pendingAttachments = composerAttachments.chat.slice();
		if (!rawText && pendingAttachments.length === 0 || !activeSessionId) return;
		const found = findSessionGlobal(activeSessionId);
		if (!found) return;
		const { session: s, host } = found;
		const canSteer = s.capabilities?.canSteer !== false && s.harness !== "codex" && s.harness !== "claude";
		if (s.status === "running" && !canSteer) {
			showToast("⏳ 当前会话正在运行且不支持中途插话，请等待完成或先点击停止");
			return;
		}
		const text = rawText || "请查看我上传的截图并帮我分析处理。";
		const optimisticText = pendingAttachments.length > 0 ? `${text}\n[🖼️ 已附带 ${pendingAttachments.length} 张截图]` : text;
		if (input) input.value = "";
		composerAttachments.chat = [];
		renderAttachmentStrip("chat");
		try {
			localStorage.removeItem(composerDraftKey(composerSessionId || activeSessionId));
		} catch {}
		autoGrowComposer();
		window.__dshOptimisticMsgs = window.__dshOptimisticMsgs || {};
		const optList = window.__dshOptimisticMsgs[s.id] || [];
		optList.push({
			text: optimisticText,
			time: Date.now()
		});
		window.__dshOptimisticMsgs[s.id] = optList.slice(-5);
		lastRenderedChatKey = "";
		renderActiveChatStage();
		const cmdType = s.status === "running" ? "steer" : "prompt";
		if (Boolean(host && host.online !== false && host.activelyConnected !== false)) showToast(pendingAttachments.length > 0 ? `🖼️ 已发送截图与指令 (${pendingAttachments.length} 张)` : cmdType === "steer" ? "⚡ 已发送实时插话" : "📨 已发送指令");
		let dispatchRes = null;
		try {
			dispatchRes = await dispatchHostCommand(s.hostId, {
				type: cmdType,
				agentId: s.id,
				cwd: s.cwd || "",
				text,
				prompt: text,
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
			window.__dshOptimisticMsgs[s.id] = (window.__dshOptimisticMsgs[s.id] || []).filter((item) => item.text !== optimisticText);
			lastRenderedChatKey = "";
			renderActiveChatStage();
			showToast("❌ " + (dispatchRes?.error || "发送指令失败"));
			if (input && !input.value.trim() && rawText) {
				input.value = rawText;
				autoGrowComposer();
			}
			if (pendingAttachments.length > 0 && composerAttachments.chat.length === 0) {
				composerAttachments.chat = pendingAttachments;
				renderAttachmentStrip("chat");
			}
			return;
		}
		if (dispatchRes.queued) showToast("⏳ 电脑当前休眠/离线，指令已排队（10分钟内上线自动执行，可随时取消）");
		setTimeout(fetchState, 250);
		setTimeout(fetchState, 800);
		const cmdId = dispatchRes?.command?.id;
		if (cmdId) (async () => {
			for (let i = 0; i < 16; i++) {
				await new Promise((r) => setTimeout(r, 350));
				try {
					const data = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`)).json();
					if (data?.ready || data?.command?.status === "completed") {
						if (data.result && data.result.ok === false) {
							window.__dshOptimisticMsgs[s.id] = (window.__dshOptimisticMsgs[s.id] || []).filter((item) => item.text !== optimisticText);
							lastRenderedChatKey = "";
							renderActiveChatStage();
							showToast("❌ " + (data.result.error || data.result.message || "发送失败"));
							if (input && !input.value.trim() && rawText) {
								input.value = rawText;
								autoGrowComposer();
							}
							if (pendingAttachments.length > 0 && composerAttachments.chat.length === 0) {
								composerAttachments.chat = pendingAttachments;
								renderAttachmentStrip("chat");
							}
						}
						fetchState();
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
		setTimeout(fetchState, 250);
		setTimeout(fetchState, 800);
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
		setTimeout(fetchState, 200);
		setTimeout(fetchState, 750);
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
		setTimeout(fetchState, 200);
		setTimeout(fetchState, 750);
	}
	async function openInChatFileDrawer() {
		const found = findSessionGlobal(activeSessionId);
		if (!found) return;
		fileProjectCwd = found.session.cwd || "";
		openSheet("inChatFileSheet");
		document.body.classList.add("mobile-file-open");
		document.getElementById("inChatFileTitle").textContent = `📂 ${found.session.project} (${found.session.hostName})`;
		await requestDirList(found.session.hostId, found.session.id, fileProjectCwd, "", true);
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
	function renderInChatFileDrawerBody() {
		const found = findSessionGlobal(activeSessionId);
		if (!found) return;
		const host = found.host;
		if (!host) return;
		const body = document.getElementById("inChatFileBody");
		reconcileFileLoading(host);
		const preview = host.lastFilePreview;
		const listing = host.lastFsListing;
		if (filePreviewLoading && filePreviewLoading.hostId === host.hostId && filePreviewLoading.drawer) {
			body.dataset.dshDrawerListKey = "";
			body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="cancelFilePreviewLoading()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);">${esc(String(filePreviewLoading.relPath || "").split("/").filter(Boolean).pop() || "文件")}</span>
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
			const kind = previewKind(preview);
			const previewKey = `${preview.at || 0}:${preview.relPath || ""}:${kind}:${(preview.content || "").length}`;
			if (body.dataset.dshPreviewKey === previewKey && body.querySelector(".file-preview-body")) return;
			body.dataset.dshPreviewKey = previewKey;
			const numberedHtml = String(preview.content || "").split("\n").map((line, i) => `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`).join("");
			const previewBodyHtml = kind === "image" ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
               <img src="${imagePreviewSrc(preview)}" alt="${esc(preview.name)}" style="max-width:100%;max-height:46vh;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.textContent='⚠️ 图片预览已过期，请返回目录重新点击文件加载';" />
               <div style="font-size:12px;color:#94a3b8;">${esc(formatBytes(preview.size))} · 长按图片可保存到相册</div>
             </div>` : kind === "binary" ? `<div class="file-preview-body" style="padding:32px 16px;background:#0f172a;color:#94a3b8;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                 <div style="font-size:32px;">📦</div>
                 <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${esc(preview.name)}</div>
                 <div style="font-size:12.5px;">二进制文件（${esc(formatBytes(preview.size))}），不支持直接文本预览</div>
               </div>` : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:340px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;">
                 ${numberedHtml}
               </div>`;
			body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="backFromDrawerPreview()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);">${esc(preview.name)}</span>
            <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="quoteFileIntoChat('${esc(preview.relPath || preview.name)}')">📎 插入到输入框</button>
          </div>
          ${previewBodyHtml}
        `;
			return;
		}
		body.dataset.dshPreviewKey = "";
		const entries = listing?.entries || [];
		const loadingDir = fileLoading && fileLoading.hostId === host.hostId && fileLoading.drawer;
		const rootCwd = listing?.rootCwd || fileProjectCwd;
		const activeSubDir = loadingDir ? fileLoading.subDir || "" : listing?.subDir || "";
		const drawerListKey = `${host.hostId}:${rootCwd}:${activeSubDir}:${loadingDir ? 1 : 0}:${listing?.at || 0}:${entries.length}`;
		if (body.dataset.dshDrawerListKey === drawerListKey && body.querySelector(".breadcrumbs-bar")) return;
		body.dataset.dshDrawerListKey = drawerListKey;
		const prevScrollTop = body.scrollTop;
		const crumbs = buildBreadcrumbSegments(activeSubDir);
		const hostId = esc(host.hostId);
		const sessionId = esc(found.session.id);
		body.innerHTML = `
        <div class="breadcrumbs-bar">
          <span class="crumb-link" onclick="requestDirList('${hostId}', '${sessionId}', '${esc(rootCwd)}', '', true)">🏠 ${esc(found.session.project)}</span>
          ${crumbs.map((c, index) => {
			return "<span style=\"color:#94a3b8;\">/</span>" + (index === crumbs.length - 1 ? `<span style="font-weight:600;color:var(--text);">${esc(c.name)}</span>` : `<span class="crumb-link" onclick="requestDirList('${hostId}', '${sessionId}', '${esc(rootCwd)}', '${esc(c.path)}', true)">${esc(c.name)}</span>`);
		}).join("")}
          ${crumbs.length === 0 ? `<span style="color:#94a3b8;margin-left:auto;font-family:monospace;">${esc(rootCwd)}</span>` : ""}
        </div>
        <div>
          ${loadingDir ? fileLoadingSpinnerHtml(activeSubDir ? `正在读取 ${activeSubDir} …` : "正在读取目录…") : entries.map((e) => `
            <div class="file-row" onclick="clickRealFileEntry('${hostId}', '${sessionId}', '${esc(rootCwd)}', '${esc(e.relPath)}', ${Boolean(e.isDirectory)}, true)">
              <div class="file-row-left">
                <span style="font-size:18px;">${e.isDirectory ? "📁" : "📄"}</span>
                <span style="font-weight:500;">${esc(e.name)}</span>
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
		if (found?.host?.lastFilePreview) found.host.lastFilePreview._showInDrawer = false;
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
			if (box && box.at !== filePreviewLoading.prevAt && box.relPath === filePreviewLoading.relPath) {
				box._showInDrawer = Boolean(filePreviewLoading.drawer);
				box._showInMain = !filePreviewLoading.drawer;
				filePreviewLoading = null;
			} else if (Date.now() - filePreviewLoading.at > 15e3) filePreviewLoading = null;
		}
	}
	async function requestDirList(hostId, agentId, cwd, subDir, inDrawer = false) {
		fileProjectCwd = cwd;
		const host = (hubState.hosts || []).find((h) => h.hostId === hostId);
		if (host?.lastFilePreview) {
			host.lastFilePreview._showInMain = false;
			host.lastFilePreview._showInDrawer = false;
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
		for (let i = 0; i < 10 && fileLoading; i++) {
			await sleepMs(400);
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
		filePreviewLoading = {
			hostId,
			relPath,
			prevAt: (hubState.hosts || []).find((h) => h.hostId === hostId)?.lastFilePreview?.at || 0,
			at: Date.now(),
			drawer: inDrawer
		};
		renderAll();
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
		for (let i = 0; i < 10 && filePreviewLoading; i++) {
			await sleepMs(400);
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
		const agentId = ((host.bridgeState?.tasks || []).find((t) => t.cwd === fileProjectCwd) || (host.bridgeState?.tasks || [])[0])?.id || "";
		const preview = host.lastFilePreview;
		if (filePreviewLoading && filePreviewLoading.hostId === host.hostId && !filePreviewLoading.drawer) {
			container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="cancelFilePreviewLoading()">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);">${esc(String(filePreviewLoading.relPath || "").split("/").filter(Boolean).pop() || "文件")}</span>
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
			const kind = previewKind(preview);
			const previewKey = `${preview.at || 0}:${preview.relPath || ""}:${kind}:${(preview.content || "").length}`;
			if (container.dataset.dshPreviewKey === previewKey && container.querySelector(".file-preview-body")) return;
			container.dataset.dshPreviewKey = previewKey;
			const numberedHtml = String(preview.content || "").split("\n").map((line, i) => `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`).join("");
			const previewBodyHtml = kind === "image" ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
               <img src="${imagePreviewSrc(preview)}" alt="${esc(preview.name)}" style="max-width:100%;max-height:62vh;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.textContent='⚠️ 图片预览已过期，请返回文件列表重新点击加载';" />
               <div style="font-size:12px;color:#94a3b8;">${esc(formatBytes(preview.size))} · 长按图片可保存到相册</div>
             </div>` : kind === "binary" ? `<div class="file-preview-body" style="padding:36px 16px;background:#0f172a;color:#94a3b8;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                 <div style="font-size:36px;">📦</div>
                 <div style="font-size:14.5px;font-weight:600;color:#e2e8f0;">${esc(preview.name)}</div>
                 <div style="font-size:13px;">二进制文件（${esc(formatBytes(preview.size))}），不支持直接文本预览</div>
               </div>` : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:calc(100% - 44px);overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.65;">
                 ${numberedHtml}
               </div>`;
			container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="closeMainFilePreview('${esc(host.hostId)}')">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);">${esc(preview.name)}</span>
            <div style="display:flex;gap:6px;">
              ${kind !== "text" ? "" : `<button class="icon-pill-btn" onclick="copyCodeText('${encodeURIComponent(preview.content || "")}')">📋 复制</button>`}
              <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="askAiAboutFile('${esc(host.hostId)}', '${esc(fileProjectCwd)}', '${esc(preview.relPath || preview.name)}')">💬 让 AI 分析</button>
            </div>
          </div>
          ${previewBodyHtml}
        `;
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
            <button class="filter-pill ${p.cwd === fileProjectCwd ? "active" : ""}" onclick="requestDirList('${esc(host.hostId)}', '${esc(agentId)}', '${esc(p.cwd)}', '')">📁 ${esc(p.name)}</button>
          `).join("")}
        </div>
      `;
		const breadcrumbHtml = `
        <div class="breadcrumbs-bar">
          <span class="crumb-link" onclick="requestDirList('${esc(host.hostId)}', '${esc(agentId)}', '${esc(rootCwd)}', '')">🏠 根目录</span>
          ${crumbs.map((c, index) => {
			return "<span style=\"color:#94a3b8;\">/</span>" + (index === crumbs.length - 1 ? `<span style="font-weight:600;color:var(--text);">${esc(c.name)}</span>` : `<span class="crumb-link" onclick="requestDirList('${esc(host.hostId)}', '${esc(agentId)}', '${esc(rootCwd)}', '${esc(c.path)}')">${esc(c.name)}</span>`);
		}).join("")}
          ${crumbs.length === 0 ? `<span style="color:#94a3b8;margin-left:auto;font-family:monospace;">${esc(rootCwd)}</span>` : ""}
        </div>
      `;
		const listHtml = loadingDir ? fileLoadingSpinnerHtml(activeSubDir ? `正在读取 ${activeSubDir} …` : "正在读取目录…") : entries.map((e) => `
        <div class="file-row" onclick="clickRealFileEntry('${esc(host.hostId)}', '${esc(agentId)}', '${esc(listing?.rootCwd || fileProjectCwd)}', '${esc(e.relPath)}', ${Boolean(e.isDirectory)}, false)">
          <div class="file-row-left">
            <span style="font-size:18px;">${e.isDirectory ? "📁" : "📄"}</span>
            <span style="font-weight:500;">${esc(e.name)}</span>
          </div>
          <span style="font-size:12px;color:#94a3b8;">${e.isDirectory ? "目录" : formatBytes(e.size)} ›</span>
        </div>
      `).join("") || `<div style="padding:36px;text-align:center;color:#94a3b8;">点击上方项目胶囊加载远程目录...</div>`;
		container.innerHTML = projectPillsHtml + breadcrumbHtml + `<div>${listHtml}</div>`;
		container.scrollTop = prevScrollTop;
	}
	function closeMainFilePreview(hostId) {
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
		setTimeout(() => document.getElementById("newTaskInput").focus(), 100);
	}
	function renderNewTaskForm() {
		const hosts = hubState.hosts || [];
		const hostChips = document.getElementById("newTaskHostChips");
		if (hosts.length === 0) hostChips.innerHTML = `
          <div style="font-size:12.5px;color:#b45309;background:var(--amber-soft);border:1px solid #fde68a;padding:9px 11px;border-radius:10px;line-height:1.5;width:100%;">
            ⚠️ 当前还没有已接入的电脑。请先关闭此面板，复制首页的「添加电脑」一行命令在电脑终端执行。
          </div>
        `;
		else hostChips.innerHTML = hosts.map((h) => `
          <button class="choice-chip ${h.hostId === newTaskHostId ? "selected" : ""}" onclick="selectNewTaskHost('${esc(h.hostId)}')">
            🟢 ${esc(h.hostName)}
          </button>
        `).join("");
		const harnessChips = document.getElementById("newTaskHarnessChips");
		if (harnessChips) harnessChips.innerHTML = [
			{
				id: "antigravity-ide",
				label: "⚡ Antigravity IDE"
			},
			{
				id: "codex",
				label: "🧠 OpenAI Codex"
			},
			{
				id: "claude",
				label: "✴️ Claude Code"
			},
			{
				id: "dsh",
				label: "🟣 DeepSeek Harness"
			}
		].map((opt) => `
          <button class="choice-chip ${opt.id === newTaskHarness ? "selected" : ""}" onclick="selectNewTaskHarness('${opt.id}')">
            ${opt.label}
          </button>
        `).join("");
		const projects = getHostProjects(hosts.find((h) => h.hostId === newTaskHostId));
		if (!projects.some((p) => p.cwd === newTaskCwd) && projects[0]) newTaskCwd = projects[0].cwd;
		const projChips = document.getElementById("newTaskProjectChips");
		projChips.innerHTML = projects.map((p) => `
        <button class="choice-chip ${p.cwd === newTaskCwd ? "selected" : ""}" onclick="selectNewTaskProject('${esc(p.cwd)}')">
          📁 ${esc(p.name)}
        </button>
      `).join("");
	}
	function selectNewTaskHost(id) {
		newTaskHostId = id;
		newTaskCwd = "";
		renderNewTaskForm();
	}
	function selectNewTaskHarness(h) {
		newTaskHarness = h;
		renderNewTaskForm();
	}
	function selectNewTaskProject(cwd) {
		newTaskCwd = cwd;
		renderNewTaskForm();
	}
	function fillQuickPrompt(text) {
		const box = document.getElementById("newTaskInput");
		box.value = text;
		box.focus();
	}
	async function submitNewTask() {
		stopVoiceInput();
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
		showToast(`🚀 正在远程电脑 (${newTaskHarness === "antigravity-ide" ? "Antigravity IDE" : newTaskHarness === "codex" ? "OpenAI Codex" : newTaskHarness === "claude" ? "Claude Code" : "DeepSeek Harness"}) 创建新任务...`);
		let dispatchRes = null;
		try {
			dispatchRes = await dispatchHostCommand(newTaskHostId, {
				type: "new_session",
				harness: newTaskHarness,
				cwd: newTaskCwd,
				title: text.slice(0, 28),
				prompt: text,
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
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.title)}</span>
        <button style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;" onclick="closeSheet('taskActionSheet')">✕</button>
      `;
		document.getElementById("actionSheetBody").innerHTML = `
        <div style="margin-bottom:10px;display:flex;gap:6px;">
          <input id="renameInlineInput" value="${esc(s.title)}" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-size:15px;outline:none;" />
          <button style="background:var(--primary);color:#fff;border:none;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer;" onclick="saveInlineRename()">保存标题</button>
        </div>
        <button class="action-item" onclick="togglePinTargetSession()">
          ${s.pinned ? "📌 取消置顶此对话" : "📌 置顶此对话（固定在列表最顶部）"}
        </button>
        <button class="action-item" onclick="shareTargetSession()">🔗 生成 AES-256 端到端加密回放链接</button>
        <button class="action-item" onclick="jumpToSessionFiles('${esc(s.hostId)}', '${esc(s.id)}', '${esc(s.cwd)}')">📂 查看【${esc(s.project)}】项目文件夹</button>
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
          会话 <strong>${esc(title)}</strong> 已完成 AES-256-GCM 端到端加密。<br/>
          <span style="font-size:11.5px;color:var(--muted);">🔐 解密密钥仅保存在链接 <code>#key=</code> 锚点中，云端服务器无法解密原始内容。</span>
        </div>
        <input
          type="text"
          readonly
          value="${esc(url)}"
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
            href="${esc(url)}"
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
				body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc(data.error || "请稍后重试")}</div>`;
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
                 📡 <strong>局域网自动修正</strong>：你当前在电脑上用 <code>${esc(location.hostname)}</code> 打开（手机扫 localhost 会连不上），已自动将二维码切换为本机局域网地址 <code>${esc(lanCandidates[0])}</code>。请确保手机与电脑连同一 Wi-Fi，或在下方改为公网/隧道地址：
               </div>` : `<div id="pairingLocalhostNotice" style="text-align:left;font-size:11.5px;line-height:1.5;color:#b45309;background:var(--amber-soft);border:1px solid #fde68a;padding:8px 10px;border-radius:10px;margin-bottom:10px;">
                 ⚠️ <strong>注意</strong>：你当前使用 <code>${esc(location.hostname)}</code> 打开，手机无法直接访问 localhost！请在下方把地址改为电脑的局域网 IP（如 <code>http://192.168.1.x:8080</code>）或公网域名后再扫码：
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
                value="${esc(defaultBaseOrigin)}"
                oninput="updatePairingQrBaseOrigin(this.value)"
                style="flex:1;min-width:0;padding:6px 9px;border-radius:8px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-family:var(--mono);font-size:11.5px;outline:none;"
              />
            </div>
            <div id="pairingQrSvgWrap" style="display:flex;justify-content:center;margin:8px 0 12px;">
              ${qrSvgHtml}
            </div>
            <div
              style="font-family:var(--mono);font-size:28px;font-weight:800;letter-spacing:6px;padding:10px 12px;border-radius:12px;background:var(--primary-soft);color:var(--primary);border:1px solid var(--border);user-select:all;"
            >${esc(codeStr)}</div>
            <div id="pairingFullLinkPreview" style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all;">${esc(activePairingLink)}</div>
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
			body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc(err && err.message || String(err))}</div>`;
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
                  <span style="font-family:var(--mono);font-size:11.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:var(--primary-soft);color:var(--primary);">${esc(code)}</span>
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
              <div style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--primary);letter-spacing:1.2px;margin-top:2px;">${esc(code)}</div>
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
          >${esc(oneLineCmd)}</div>

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
				totalBytes: h.totalBytes || 0,
				turbo: h.bridgeState?.turbo?.engineLabel || "",
				power: h.bridgeState?.systemTelemetry?.power?.label || "",
				net: h.bridgeState?.systemTelemetry?.network?.label || "",
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
			return `
                <div class="host-visual-card ${h.isFeishuActive ? "active-feishu" : ""}" style="padding:12px 14px;">
                  <div
                    style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none;"
                    onclick="toggleHostSettingsCard('${esc(h.hostId)}')"
                  >
                    <div style="min-width:0;flex:1;">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="status-dot ${h.online && !isRevoked ? "" : "offline"}"></span>
                        <span style="font-size:14.5px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;">${esc(h.hostName)}</span>
                        ${h.isFeishuActive ? `<span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--primary-soft);color:var(--primary);">🎯 主控</span>` : ""}
                        ${isRevoked ? `<span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--red-soft);color:var(--red);">🚫 已吊销</span>` : ""}
                      </div>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>${h.online ? `${tm.powerIcon} ${esc(tm.powerShort)}` : `⚪ 离线 (${formatTime(h.lastSeen)})`}</span>
                        <span>·</span>
                        <span>${tm.netIcon} ${esc(tm.netShort)}</span>
                        <span>·</span>
                        <span>💬 ${sessCount} 会话${runCount > 0 ? ` (<strong style="color:var(--green);">${runCount} 运行中</strong>)` : ""}</span>
                        <span>·</span>
                        <span>${turboShort}</span>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
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
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${tm.powerIcon} ${esc(tm.powerDetail)}${tm.lowBattery ? " ⚠️" : ""}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">网络与延迟</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${tm.netIcon} ${esc(tm.netDetail)}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">会话与存储</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${sessCount} 条 · ${runCount} 运行 · ${formatBytes(h.totalBytes)}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">同步与系统</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${esc(h.platform || "macOS")} ${esc(h.arch || "")} · ${turboShort}</div>
                        </div>
                      </div>

                      <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11.5px;">
                        <span style="padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">🟣 DSH · ✅ 远控+审批</span>
                        <span style="padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">⚡ Antigravity · ✅ 远控+审批</span>
                        ${(h.bridgeState?.harnesses || []).map((ad) => `
                          <span style="padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">
                            ${esc(ad.icon || "🔌")} ${esc(ad.label || ad.id)} · ${ad.hasBinary ? "🔵 看会话/发指令" : ad.installed ? "👀 观察模式" : "⚪ 未安装"}
                          </span>
                        `).join("")}
                      </div>

                      <div style="font-size:11.5px;color:var(--muted);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                        <span>🔒 指纹 <code>${esc(shortFp)}</code> · ${h.hasDedicatedToken ? `🔑 独立凭证 (${esc(h.hostTokenPreview)})` : "🔑 管理员凭证"}</span>
                        <span>${h.syncMeta?.seq ? `同步序号 #${h.syncMeta.seq}` : ""}</span>
                      </div>

                      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;padding-top:4px;">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button class="pill-action-btn ${h.isFeishuActive ? "primary" : ""}" style="padding:5px 10px;font-size:11.5px;" onclick="activateFeishuHost('${esc(h.hostId)}')">
                            ${h.isFeishuActive ? "🎯 飞书当前主控" : "切飞书到这台"}
                          </button>
                          <button class="pill-action-btn ${h.remoteActive ? "primary" : ""}" style="padding:5px 10px;font-size:11.5px;" onclick="toggleHostRemoteMode('${esc(h.hostId)}', ${!h.remoteActive})">
                            ${h.remoteActive ? "🔔 飞书通知: 开" : "🔕 飞书通知: 关"}
                          </button>
                          <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;" onclick="openTurboGuideSheet()">
                            ${h.bridgeState?.turbo?.enabled ? "⚡ 极速详情" : "🚀 一键提速"}
                          </button>
                        </div>
                        <div>
                          ${isRevoked ? `
                            <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;" onclick="unrevokeHostCredential('${esc(h.hostId)}', '${esc(h.hostName)}')">恢复接入</button>
                          ` : `
                            <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;color:var(--red);" onclick="revokeHostCredential('${esc(h.hostId)}', '${esc(h.hostName)}')">🚫 吊销凭证</button>
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
                    <th style="padding:6px 4px;">看会话</th>
                    <th style="padding:6px 4px;">发指令</th>
                    <th style="padding:6px 4px;">停止</th>
                    <th style="padding:6px 4px;">手机审批</th>
                    <th style="padding:6px 4px;">实时插话</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom:1px solid var(--hairline);">
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">DSH</td>
                    <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--hairline);">
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">Antigravity IDE</td>
                    <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--hairline);">
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">Claude Code</td>
                    <td>✅</td><td>✅</td><td>✅</td><td style="color:var(--muted);">计划中</td><td>❌</td>
                  </tr>
                  <tr>
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">Codex</td>
                    <td>✅</td><td>✅</td><td>✅</td><td style="color:var(--muted);">计划中</td><td>❌</td>
                  </tr>
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
                    <div class="settings-item-title">🔐 最近生成（来自 ${esc(item.hostName)}）</div>
                    <span style="font-size:11.5px;color:var(--muted);">${formatTime(item.at)}</span>
                  </div>
                  <div style="font-size:11.5px;color:var(--muted);font-family:var(--mono);word-break:break-all;background:var(--subtle);padding:6px 8px;border-radius:8px;">
                    ${esc(item.fullUrl)}
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button class="pill-action-btn primary" onclick="copyCodeText('${encodeURIComponent(item.fullUrl)}', '🔗 加密分享链接已复制')">📋 复制完整解密链接</button>
                    <a href="${esc(item.fullUrl)}" target="_blank" rel="noopener" class="pill-action-btn" style="text-decoration:none;display:inline-flex;align-items:center;">🌐 打开</a>
                  </div>
                </div>
              `).join("")}
              ${shares.length ? shares.slice(0, 8).map((s) => `
                <div class="settings-item">
                  <div>
                    <div class="settings-item-title">${esc(s.title || "加密会话回放")}</div>
                    <div class="settings-item-desc">来自 ${esc(s.hostName || s.hostId || "远端电脑")} · ${formatTime(s.createdAt)} · ${formatBytes(s.sizeBytes || 0)}</div>
                  </div>
                  <button class="pill-action-btn" style="color:var(--red);" onclick="deleteShareRecord('${esc(s.id || s.shareId)}')">🗑️ 销毁</button>
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
                <div id="pushLocalStatus" style="margin-top:9px;font-size:12.5px;font-weight:600;color:var(--primary);">
                  正在检测本机推送状态…
                </div>
                <div id="pushDeviceList" style="margin-top:4px;font-size:12px;color:var(--muted);line-height:1.55;"></div>
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

          <div
            style="text-align:center;padding:8px 12px 18px;font-size:11.5px;color:var(--muted);cursor:pointer;user-select:none;"
            onclick="copyCodeText('${encodeURIComponent(`DSH Hub v${buildInfo.version || "0.2.0"} (${buildInfo.uiBuild || "dev"}) · started ${buildInfo.startedAt ? new Date(buildInfo.startedAt).toISOString() : ""}`)}', '📋 版本信息已复制')"
          >
            DSH 远控总控台 v${esc(buildInfo.version || "0.2.0")} · 构建 <code>${esc(buildInfo.uiBuild || "dev")}</code>${buildInfo.startedAt ? " · 云端启动于 " + formatTime(buildInfo.startedAt) : ""}
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
		if (!manual && Date.now() - lastPushStatusAt < 1500) return;
		lastPushStatusAt = Date.now();
		const statusEl = document.getElementById("pushLocalStatus");
		const listEl = document.getElementById("pushDeviceList");
		if (!statusEl) return;
		const subs = hubState.pushSubscriptions || [];
		if (listEl) {
			if (!subs.length) listEl.textContent = "还没有设备登记推送";
			else {
				const devices = subs.slice(0, 5).map((sub) => {
					return `${sub.deviceName || "未知设备"}${sub.endpointHost ? ` · ${sub.endpointHost}` : ""}`;
				});
				const more = subs.length > 5 ? ` 等 ${subs.length} 台` : "";
				listEl.textContent = `已在服务端登记 ${subs.length} 台设备：${devices.join("；")}${more}`;
			}
		}
		if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
			statusEl.textContent = "本机：当前浏览器不支持锁屏推送（iPhone 需从主屏幕 App 打开）";
			statusEl.style.color = "#d97706";
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
				if (expectedKey && localKey && localKey !== expectedKey || !subs.length) {
					const synced = await ensureLocalPushSubscriptionSynced();
					if (synced) sub = synced;
				}
				statusEl.textContent = "本机：✅ 已开启锁屏推送";
				statusEl.style.color = "#059669";
			} else if (sub && permission === "denied") {
				statusEl.textContent = "本机：已订阅但通知权限被拒绝，请到「设置 → 通知」中允许";
				statusEl.style.color = "#dc2626";
			} else if (permission === "denied") {
				statusEl.textContent = "本机：通知权限被拒绝，请到「设置 → 通知 → DSH 远控」中允许";
				statusEl.style.color = "#dc2626";
			} else {
				statusEl.textContent = "本机：未开启（点下方「开启推送」）";
				statusEl.style.color = "#d97706";
			}
			if (langPref === "en") applyLangToDom(document.body, langPref);
			if (manual) showToast("已刷新推送状态");
		} catch (err) {
			statusEl.textContent = "本机：状态读取失败（" + (err && err.message || err) + "）";
			statusEl.style.color = "#dc2626";
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
			refreshPushStatus();
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
            💻 ${esc(srcObj?.hostName || migSource)}
            <div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:2px;">源电脑</div>
          </div>
          <button class="pill-action-btn" onclick="swapMigrateHosts()">⇄ 互换</button>
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--border);text-align:center;font-weight:700;font-size:14px;color:var(--primary);">
            💻 ${esc(dstObj?.hostName || migTarget)}
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
          <div class="host-option ${h.hostId === currentHostId ? "selected" : ""}" onclick="selectHost('${esc(h.hostId)}')">
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text);">${h.online ? "🟢" : "⚪"} ${esc(h.hostName)}</div>
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
                  <strong style="font-size:14px;color:var(--text);">${h.online ? "🟢" : "⚪"} ${esc(h.hostName)}</strong>
                  <span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:${isTurbo ? "var(--green-soft)" : "var(--amber-soft)"};color:${isTurbo ? "var(--green)" : "var(--amber)"};">
                    ${esc(tb?.engineLabel || "🐢 标准轮询模式")}
                  </span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
                  辅助功能遥控权限：${axOk ? "<span style=\"color:var(--green);font-weight:600;\">✅ 已授权 (支持 1ms 审批点击)</span>" : "<span style=\"color:var(--amber);font-weight:600;\">⚠️ 待开启或待升级</span>"}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="pill-action-btn primary" style="font-size:12px;padding:5px 11px;" onclick="upgradeHostTurbo('${esc(h.hostId)}')">
                    🚀 远程一键升级/刷新极速引擎
                  </button>
                  <button class="pill-action-btn" style="font-size:12px;padding:5px 11px;" onclick="requestHostAxPermission('${esc(h.hostId)}')">
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
	async function upgradeHostTurbo(hostId) {
		showToast("🚀 已发送远程升级并启用 Rust 极速引擎指令...");
		await dispatchHostCommand(hostId, { type: "upgrade_turbo" });
		setTimeout(fetchState, 600);
		setTimeout(() => {
			if (document.getElementById("turboGuideSheet").classList.contains("open")) openTurboGuideSheet();
		}, 1200);
	}
	function rawCloseSheet(id) {
		if (id === "newTaskSheet") stopVoiceInput();
		document.getElementById(id)?.classList.remove("open");
		if (id === "inChatFileSheet") document.body.classList.remove("mobile-file-open");
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
		const EDGE = 30;
		let tracking = false;
		let decided = null;
		let startX = 0;
		let startY = 0;
		let lastX = 0;
		let lastY = 0;
		let startedAt = 0;
		let width = 0;
		const resetChatStyle = () => {
			chat.style.transition = "";
			chat.style.transform = "";
			chat.style.willChange = "";
			chat.style.boxShadow = "";
		};
		const isHorizontallyScrollable = (target) => {
			let node = target;
			while (node && node !== chat && node.nodeType === 1) {
				const overflowX = window.getComputedStyle(node).overflowX;
				if (/(auto|scroll)/.test(overflowX) && node.scrollWidth > node.clientWidth + 4) return true;
				node = node.parentElement;
			}
			return false;
		};
		chat.addEventListener("touchstart", (event) => {
			if (event.touches.length !== 1) return;
			if (!document.body.classList.contains("mobile-chat-open")) return;
			if (document.body.classList.contains("DesktopSplitMode")) return;
			const touch = event.touches[0];
			const rect = chat.getBoundingClientRect();
			if (touch.clientX - rect.left > EDGE) return;
			if (isHorizontallyScrollable(event.target)) return;
			tracking = true;
			decided = null;
			startX = touch.clientX;
			startY = touch.clientY;
			lastX = startX;
			lastY = startY;
			startedAt = Date.now();
			width = rect.width || window.innerWidth;
		}, { passive: true });
		chat.addEventListener("touchmove", (event) => {
			if (!tracking) return;
			const touch = event.touches[0];
			const dx = touch.clientX - startX;
			const dy = touch.clientY - startY;
			lastX = touch.clientX;
			lastY = touch.clientY;
			if (decided === null) {
				if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
				decided = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2;
				if (!decided) {
					tracking = false;
					return;
				}
				chat.style.transition = "none";
				chat.style.willChange = "transform";
			}
			if (dx <= 0) return;
			if (event.cancelable) event.preventDefault();
			chat.style.transform = `translateX(${Math.min(dx, width)}px)`;
			chat.style.boxShadow = "-10px 0 30px rgba(15, 23, 42, 0.16)";
		}, { passive: false });
		const finishSwipe = () => {
			if (!tracking) return;
			tracking = false;
			const dismiss = shouldDismissHorizontalSwipe({
				dx: Math.max(0, lastX - startX),
				dy: Math.abs(lastY - startY),
				width,
				durationMs: Date.now() - startedAt
			});
			chat.style.transition = "transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)";
			if (dismiss) {
				chat.style.transform = `translateX(${width}px)`;
				closeMobileChat();
				setTimeout(resetChatStyle, 260);
			} else {
				chat.style.transform = "translateX(0px)";
				setTimeout(resetChatStyle, 280);
			}
		};
		chat.addEventListener("touchend", finishSwipe);
		chat.addEventListener("touchcancel", finishSwipe);
	}
	function setupSheetSwipeDismiss() {
		document.querySelectorAll(".sheet-backdrop").forEach((backdrop) => {
			const panel = backdrop.querySelector(".sheet-panel");
			if (!panel) return;
			let tracking = false;
			let startX = 0;
			let startY = 0;
			let lastX = 0;
			let lastY = 0;
			let startedAt = 0;
			const resetPanelStyle = () => {
				panel.style.transition = "";
				panel.style.transform = "";
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
			panel.addEventListener("touchstart", (event) => {
				if (event.touches.length !== 1) return;
				if (panel.scrollTop > 0 || hasScrolledInner(event.target)) return;
				const touch = event.touches[0];
				tracking = true;
				startX = touch.clientX;
				startY = touch.clientY;
				lastX = startX;
				lastY = startY;
				startedAt = Date.now();
			}, { passive: true });
			panel.addEventListener("touchmove", (event) => {
				if (!tracking) return;
				const touch = event.touches[0];
				const dy = touch.clientY - startY;
				const dx = touch.clientX - startX;
				lastX = touch.clientX;
				lastY = touch.clientY;
				if (dy <= 0) return;
				if (Math.abs(dx) > dy * 1.2) {
					tracking = false;
					return;
				}
				if (event.cancelable) event.preventDefault();
				panel.style.transition = "none";
				panel.style.willChange = "transform";
				panel.style.transform = `translateY(${dy}px)`;
			}, { passive: false });
			const finishSwipe = () => {
				if (!tracking) return;
				tracking = false;
				const dismiss = shouldDismissVerticalSwipe({
					dy: Math.max(0, lastY - startY),
					dx: lastX - startX,
					height: panel.offsetHeight,
					durationMs: Date.now() - startedAt
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
	function maybeShowSwipeHint() {
		if (!("ontouchstart" in window)) return;
		try {
			if (localStorage.getItem("dsh_swipe_hint_v1")) return;
			localStorage.setItem("dsh_swipe_hint_v1", "1");
		} catch {
			return;
		}
		setTimeout(() => showToast("💡 提示：从左边缘向右滑，即可返回会话列表"), 600);
	}
	function setupOverlayGestures() {
		setupChatSwipeBack();
		setupSheetSwipeDismiss();
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
			const prev = prevHosts.find((h) => h.hostId === host.hostId)?.lastFilePreview;
			const next = host.lastFilePreview;
			if (!prev || !next) continue;
			if (prev.at === next.at && prev.relPath === next.relPath) {
				next._showInMain = Boolean(prev._showInMain);
				next._showInDrawer = Boolean(prev._showInDrawer);
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
			}
		});
	} catch {}
	function setConnectionBanner(disconnected, message = "") {
		const banner = document.getElementById("connectionStatusBanner");
		if (!banner) return;
		if (disconnected) {
			banner.textContent = message || "⚠️ 网络连接中断，正在自动重连… 点此立即重试";
			banner.style.display = "flex";
		} else banner.style.display = "none";
	}
	function applyHubState(nextState) {
		preservePreviewUiState(nextState);
		hubState = nextState;
	}
	let hasLoadedInitialState = false;
	let lastStateFetchAt = 0;
	let stateFetchSeq = 0;
	async function fetchState() {
		const mySeq = ++stateFetchSeq;
		try {
			const data = await (await apiFetch("/api/state")).json();
			if (mySeq < stateFetchSeq) return {
				ok: true,
				superseded: true
			};
			if (data.ok) {
				hasLoadedInitialState = true;
				lastStateFetchAt = Date.now();
				setConnectionBanner(false);
				applyHubState(data);
				renderAll();
				flushPendingDeepLink();
				ensureLocalPushSubscriptionSynced();
				return { ok: true };
			}
			return {
				ok: false,
				error: data.error || "服务端返回异常"
			};
		} catch (err) {
			const message = err && err.message ? err.message : String(err);
			if (message !== "Unauthorized") setConnectionBanner(true);
			return {
				ok: false,
				unauthorized: message === "Unauthorized",
				error: message
			};
		}
	}
	let sseSource = null;
	let sseConnected = false;
	let lastSseEventAt = 0;
	function connectSSE() {
		if (urlParams.get("nosse") === "1") return;
		if (sseSource) try {
			sseSource.close();
		} catch {}
		sseConnected = false;
		const tk = getToken();
		const url = "/api/events?initial=0" + (tk ? "&token=" + encodeURIComponent(tk) : "");
		try {
			sseSource = new EventSource(url);
			sseSource.onopen = () => {
				sseConnected = true;
				lastSseEventAt = Date.now();
				setConnectionBanner(false);
				if (!hasLoadedInitialState || Date.now() - lastStateFetchAt > 2500) fetchState();
			};
			sseSource.onerror = () => {
				sseConnected = false;
			};
			sseSource.addEventListener("ping", () => {
				sseConnected = true;
				lastSseEventAt = Date.now();
				setConnectionBanner(false);
			});
			sseSource.addEventListener("state", (evt) => {
				try {
					sseConnected = true;
					lastSseEventAt = Date.now();
					setConnectionBanner(false);
					const data = JSON.parse(evt.data);
					if (data.ok) {
						hasLoadedInitialState = true;
						lastStateFetchAt = Date.now();
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
		esc,
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
		selectAgyApprovalOption,
		submitAgyApproval,
		copyAssistantReply,
		copyLatestAssistantReply,
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
		persistComposerDraft,
		autoGrowComposer,
		onComposerInput,
		composerUsesCoarsePointer,
		shouldSendOnEnter,
		onComposerKeydown,
		switchComposerSession,
		triggerImagePicker,
		onChatImageSelected,
		onComposerPaste,
		removeComposerAttachment,
		renderAttachmentStrip,
		compressImageFile,
		setVoiceBtnRecording,
		isVoiceRecording,
		stopVoiceInput,
		toggleVoiceInput,
		sendPromptToActiveSession,
		cancelQueuedCommand,
		sendQuickFollowup,
		stopActiveSession,
		sendApprovalDecision,
		openInChatFileDrawer,
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
		upgradeHostTurbo,
		rawCloseSheet,
		trackOverlay,
		openSheet,
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
		applyHubState,
		getHubState: () => hubState,
		fetchState,
		connectSSE
	});
	setupOverlayGestures();
	setupChatScrollWatcher();
	setupInstallHint();
	if (queryPairCode) (async () => {
		try {
			const exRes = await fetch("/api/pairing/exchange", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ code: queryPairCode.toUpperCase() })
			});
			const exData = await exRes.json().catch(() => ({}));
			if (exRes.ok && exData.token) {
				localStorage.setItem("dsh_hub_token", exData.token);
				showToast("🔓 扫码登录成功");
			} else showToast("⚠️ 扫码配对码已过期或无效，请重新扫码");
		} catch {}
		await fetchState();
		connectSSE();
	})();
	else {
		fetchState();
		connectSSE();
	}
	setInterval(() => {
		if (!sseConnected || Date.now() - lastSseEventAt > 15e3) fetchState();
	}, 5e3);
}
// hub/web/src/main.tsx
var root = document.getElementById("app");
if (root) {
	K(/* @__PURE__ */ k(App, null), root);
	initHubController();
}
