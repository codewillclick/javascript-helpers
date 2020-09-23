helpers_js = true;


exports = (typeof exports === 'undefined' ? {} : exports);

function $q(d,q) {
	if (!q) {
		q = d;
		d = document;
	}
	return d.querySelector(q);
}
function $qq(d,q) {
	if (!q) {
		q = d;
		d = document;
	}
	return d.querySelectorAll(q)
}
exports.q = $q;
exports.qq = $qq;

function $r() {
	return Array.from.apply(null,arguments)
}

function $el(t) { return document.createElement(t) }
exports.el = $el;

function $def(a) { return typeof a !== 'undefined' }
exports.def = $def;

// Oh neat, generators!
function * $iterrange(a,b) {
	while (a < b) {
		yield a;
		a++;
	}
}
exports.iterrange = $iterrange;

// Oh hey, iterators!
function * $itermap(r,f) {
	var i=0;
	f = f ? f : ((a)=>a)
	if (r[Symbol.iterator])
		for (var a of r)
		{ yield f(a,i,r); i++ }
	else
		for (var k in r)
		{ yield f(r[k],i,r); i++ }
}
exports.itermap = $itermap;

function * $iterfilter(r,check) {
	if (r[Symbol.iterator])
		for (var a of r)
			if (check(a))
			{ yield a }
	else
		for (var k in r)
			if (check(r[k]))
				yield r[k]
}
exports.iterfilter = $iterfilter;

function $cs(e) {
	var r,ret;
	if (arguments.length == 1) {
		if (Array.isArray(e))
			r = e;
		else
			return window.getComputedStyle((typeof e === 'string' ? $q(e) : e),null);
	}
	else
		r = arguments;
	ret = [];
	for (var i in r) {
		e = r[i];
		e = (typeof e === 'string' ? $q(e) : e)
		ret.push(window.getComputedStyle(e,null));
	}
	return ret;
}
function $csp(e,p,ob) {
	ob = ob || {}
	if (Array.isArray(p)) {
		var c = $cs(e);
		var ret = [];
		for (var i in p) {
			k = p[i]
			ret.push(ob[k]=c.getPropertyValue(k));
		}
		return ret;
	}
	else
		return $cs(e).getPropertyValue(p);
}
exports.cs = $cs;
exports.csp = $csp;

function $arr(a) {
	var ret = [];
	for (var i in a)
		ret.push(a[i]);
	return ret;
}
exports.arr = $arr;

function $toarr(a) {
	var ret = [];
	for (var i=0; i < a.length; ++i)
		ret.push(a[i]);
	return ret;
}
exports.toarr = $toarr;

function $props(a) {
	var ret = [];
	for (var i in a)
		ret.push(i);
	return ret;
}
exports.props = $props;

function $getObject(ob,stack) {
	for (var i=0; i < stack.length-1; ++i) {
		if (typeof ob[stack[i]] === 'undefined')
			return undefined;
		ob = ob[stack[i]];
	}
	var ret = [ob,stack[stack.length-1]];
	ret.push(ret[0][ret[1]]);
	return ret;
}
exports.getObject = $getObject;

function $setObject(ob,stack,v,InitClass) {
	InitClass = (InitClass && InitClass != false) ? InitClass : Object;
	if (InitClass !== false)
		for (var i=0; i < stack.length-1; ++i) {
			if (typeof ob[stack[i]] === 'undefined')
				ob[stack[i]] = new InitClass();
			ob = ob[stack[i]];
	}
	else 
		for (var i=0; i < stack.length-1; ++i) {
			if (typeof ob[stack[i]] === 'undefined')
				return undefined;
			ob = ob[stack[i]];
		}
	ob[stack[stack.length-1]] = v;
	return ob;
}
exports.setObject = $setObject;

function $get(ob,stack) {
	var a = (a=$getObject(ob,stack))[0][a[1]];
	return a;
}
exports.get = $get;

function $set(ob,stack,val) {
	var a = (a=$getObject(ob,stack))[0][a[1]] = val;
	return val;
}
exports.set = $set;

function $iterate(ob,f,limit,appender) {
	var i=0;
	appender = (appender ? appender : {push:function(){}});
	if (typeof(limit) === 'function') {
		while (i < limit() && ob.hasNext())
			appender.push(f(ob.next(),i++,ob));
	}
	else {
		limit = ((limit=parseFloat(limit)) != NaN && limit >= 0
			? limit
			: Number.MAX_SAFE_INTEGER);
		while (i < limit && ob.hasNext())
			appender.push(f(ob.next(),i++,ob));
	}
}
exports.iterate = $iterate;

function $zip() {
	var a = arguments;
	if (a.length === 1)
		a = a[0];
	var count = a.length;
	var first = a[0];
	var ret = [];
	for (var i=0; i < first.length; ++i) {
		var current = [];
		for (var j=0; j < count; ++j)
			current.push(a[j][i]);
		ret.push(current);
	}
	return ret;
}
exports.zip = $zip;

function $unzip() {
	var a = arguments;
	if (a.length === 1)
		a = a[0];
	var first = a[0];
	var ret = first.map(function(){return []});
	for (var i=0; i < a.length; ++i) {
		for (var j=0; j < first.length; ++j)
			ret[j].push(a[i][j]);
	}
	return ret;
}
exports.unzip = $unzip;

// UNCERTAIN: Should I also fire these callbacks for the root object?
// TODO: Replace identifier with idstack and propagate to locations of use.
function $nest(ob,capture,bubble,stack,identifier,idstack) {
	stack = (stack || []);
	idstack = (idstack || []);
	if (capture)
		capture(ob,stack,identifier,idstack);
	if (typeof ob === 'object' && ob !== null) {
		stack.push(ob);
		for (var p in ob) {
			idstack.push(p);
			$nest(ob[p],capture,bubble,stack,p,idstack);
			idstack.pop();
		}
		stack.pop();
	}
	if (bubble)
		bubble(ob,stack,identifier,idstack);
}
exports.nest = $nest;

function $nestElement(ob,capture,bubble,stack,identifier) {
	stack = (stack || []);
	if (capture && ob && ob.nodeName)
		capture(ob,stack,identifier);
	if (ob.childNodes) {
		stack.push(ob);
		for (var i in ob.childNodes)
			$nestElement(ob.childNodes[i],capture,bubble,stack,i);
		stack.pop();
	}
	if (bubble && ob && ob.nodeName)
		bubble(ob,stack,identifier);
}
exports.nestElement = $nestElement;

function $assignTo(a,b) {
	var keys = [];
	$nest(
		a,
		function(ob,stack,k) {
			if (k !== undefined)
				keys.push(k);
		},
		function(ob,stack,k) {
			if (typeof ob !== 'object')
				$set(b,keys,ob);
			if (k !== undefined)
				keys.pop(k);
		});
	return a;
}
exports.assignTo = $assignTo;

function $mirror(a,b,nest) {
	nest = (nest || $nest);
	var stack2 = []; // This object should go unused in the end.
	nest(
		a,
		function(ob,stack,k) {
			if (k === undefined) {
				stack2.push(b);
				return;
			}
			if (typeof(ob) === 'object' && ob !== null) {
				var prior = stack2[stack2.length-1];
				var ob2 = (prior[k] !== undefined
					? prior[k]
					: (Array.isArray(ob) ? prior[k]=[] : prior[k]={}));
				stack2.push(ob2);
			}
			else
				stack2[stack2.length-1][k] = ob;
		},
		function(ob,stack,k) {
			if (typeof(ob) === 'object' && ob !== null)
				stack2.pop();
		}
	);
	return b;
}
exports.mirror = $mirror;

function $elementTable(e) {
	var ret = {};
	$nestElement(
		e,
		function(e) {
			
			// Option elements are a special case and do not require an id attribute,
			// but must belong to a select object with an id attribute.
			if (e instanceof HTMLOptionElement) {
				var select = ret[e.parentNode.id];
				if (!select)
					return;
				// UNCERTAIN: Should I have it work with the option element's value or
				//   the value at the index location provided by e.index regardless of
				//   which option element is now in that position?
				Object.defineProperty(select,e.index,{
					enumerable:true,
					get:function() { return e.value },
					set:function(v) {
						if (typeof v !== 'string') {
							e.value = (v[0] !== null ? v[0] : v[1]);
							e.text  = (v[1] !== null ? v[1] : v[0]);
						}
						else
							e.value = v
						return e.value;
					}
				});
				return;
			}
			if (e instanceof HTMLInputElement && e.type === 'radio') {
				// TODO
			}
			if (e instanceof HTMLInputElement && e.type === 'checkbox') {
				// TODO
			}
			
			// Only maps an element with an 'id' attribute.
			if (!e.id)
				return;
			
			if (e.id && e instanceof HTMLSelectElement) {
				var select = {};
				Object.defineProperty(ret,e.id,{
					enumerable:true,
					writable:false,
					value:select
				});
				Object.defineProperty(select,'index',{
					enumerable:true, // true, so that storing and loading work.
					get:function() { return e.selectedIndex },
					set:function(v) { return e.selectedIndex = parseInt(v) }
				});
			}
			else if (e.id && typeof e.value !== 'undefined') {
				Object.defineProperty(ret,e.id,{
					enumerable:true,
					get:function() { return e.value },
					set:function(v) { return e.value = v }
				});
			}
		},
		function(e){});
	return ret;
}
exports.elementTable = $elementTable;

function $proto(n) {
	n = (typeof n === 'string' ? $q(n) : n);
	var ret = {};
	for (var i=0; i < n.childNodes.length; ++i) {
		var e = n.childNodes[i];
		if (e.id)
			ret[e.id] = (function(el) {
				return function() { return el.cloneNode(true)
			}})(e);
	}
	return ret;
}
exports.proto = $proto;

function $ajax(method,url,asynch,params)
{
	var p = (params ? params : {});
	
	// In case p is a callback, itself, convert to object format
	if (typeof p === 'function')
	{
		var f = p;
		p =
		{ onreadystatechange:function()
			{ if (this.readyState == 4) f(this); }
		};
	}
	else if ('ready' in p && typeof p.ready === 'function') {
		var f = p.ready;
		p = {
			onreadystatechange:function()
			{ if (this.readyState == 4) f(this); }
		};
	}
	
	var x = new XMLHttpRequest();	
	// NOTE: There was a case where x would not be assigned p's
	//   onreadystatechange function.  For now, doing the check/assign
	//   manually.
	//$assign(x,p);
	if (p.onreadystatechange || p.ready)
		x.onreadystatechange = p.onreadystatechange || p.ready;
	if (p.onerror || p.error)
		x.onerror = p.onerror || p.error;
	if (method == 'GET' || !$def(params))
	{
		x.open(method,url,asynch,p.user,p.password);
		x.send();
	}
	else if (method == 'POST' && $def(params))
	{
		if (typeof params == 'string')
		{	
			x.open('POST',url,asynch);
			x.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			x.send(params);
		}
		else if ('data' in params && typeof params.data == 'string')
		{	
			x.open('POST',url,asynch);
			x.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			x.send(params.data);
		}
	}
	
	return x;
}
exports.ajax = $ajax;

function $trueOffset(n) {
	var a = {x:n.offsetLeft,y:n.offsetTop};
	n = n.offsetParent;
	while (n) {
		a.x += n.offsetLeft;
		a.y += n.offsetTop;
		n = n.offsetParent;
	}
	return a;
}
exports.trueOffset = $trueOffset;

function $mutWaitChild(target,div,callback,config) {
	var obs = new MutationObserver(function(muts) {
		muts.forEach(function(mut) {
			if (!mut.addedNodes)
				return;
			if (!($toarr(mut.addedNodes).includes(div)))
				return;
			callback(mut);
			obs.disconnect();
			return;
		});
	});
	config = config || {};
	config.childList = true;
	obs.observe(target,config);
}
exports.mutWaitChild = $mutWaitChild;

function $mutDelayOnAttrib(div,callback,wait,attributeFilter) {
	wait = wait || 150;
	attributeFilter = attributeFilter || ['value'];
	if (typeof attributeFilter === 'string')
		// It's a list of arguments, rather than a single array.
		attributeFilter = Array.prototype.slice.call(arguments,3);
	var last = new Date().getTime();
	var m = new MutationObserver(function(muts) {
		last = new Date().getTime();
		setTimeout(function() {
			var t = new Date().getTime();
			if (t - last >= wait)
				callback.call(div,m,muts);
		},wait)
	});
	m.observe(div,{attributes:true,attributeFilter:attributeFilter});
	return m;
}
exports.mutDelayOnAttrib = $mutDelayOnAttrib;

function $delayOnEvent(div,ev,callback,wait) {
	wait = wait || 150;
	var last;
	var f;
	div.addEventListener(ev,f=function(e) {
		last = new Date().getTime();
		setTimeout(function() {
			var t = new Date().getTime();
				if (t - last >= wait)
					callback(e);
		},wait);
	});
	// Return handle for possible event removal.
	return [ev,f];
}
exports.delayOnEvent = $delayOnEvent;

// WARNING: Something may be wrong with binsearch.
function $binsearchComp(r,v,f) {
	var a = 0;
	var b = r.length-1;
	var m = Math.floor((a+b)*.5);
	var x;
	
	while ((x=f(v,r[m])) != 0 && a < b) {
		//console.log('eh',a,b,m,x);
		if (x < 0)
			b = m - 1;
		else if (x > 0)
			a = m + 1;
		m = Math.floor((a+b)*.5);
	}
	
	return (x != 0 ? -(m+1) : m);
}
exports.binsearchComp = $binsearchComp;

function $binsearch(r,v) {
	return $binsearchComp(r,v,function(a,b) {
		return (a < b ? -1 : (a > b ? 1 : 0));
	});
}
exports.binsearch = $binsearch;

function $super() {
	var ob = arguments[0];
	var args = []; // arguments has no slice method.
	for (var i=1; i < arguments.length; ++i)
		args.push(arguments[i]);
	ob._parent.apply(ob,args);
	return ob;
}
//exports.super = $super;

function $supercall() {
	var ob = arguments[0];
	var prop = arguments[1];
	var args = []; // arguments has no slice method.
	for (var i=2; i < arguments.length; ++i)
		args.push(arguments[i]);
	ob._parent.prototype[prop].apply(ob,args);
	return ob;
}
exports.supercall = $supercall;

function $superF(func) {
	return function() {
		var ob = arguments[0];
		var args = [];
		for (var i=1; i < arguments.length; ++i)
			args.push(arguments[i]);
		func.apply(ob,args);
		return ob;
	}
}
exports.superF = $superF;



