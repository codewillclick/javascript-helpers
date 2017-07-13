
var module = module || {};
module.exports = module.exports || window;

(function(M) {


// NOTE: I don't think this one is in itertools, but it's useful nonetheless.
M.range = function * range(a,b) {
	for (var i=a; i < b; ++i)
		yield i;
}

M.count = function * count(a,step) {
	step = (typeof step === 'number' ? step : 1);
	while (true) {
		yield a;
		a += step;
	}
}

M.cycle = function * cycle(r) {
	while (true)
		for (var a of r)
			yield a;
}

M.repeat = function * repeat(a) {
	while (true)
		yield a;
}

M.chain = function * chain() {
	for (var r of arguments)
		for (var a of r)
			yield a;
}
M.chain.from_iterable = function * from_iterable(it) {
	for (var r of it)
		for (var a of r)
			yield a;
}

M.izip = function * izip() {
	for (var r of izip.reference.apply(this,arguments))
		yield new Array(r);
}
M.izip.reference = function * izip_reference() {
	var a,i=0;
	var ret = new Array(arguments.length);
	// NOTE: A custom property distinguishing this from a generic Array seems to
	//   be necessary for node js to pass ret by reference, rather than passing a
	//   clone.
	//
	// TODO: Replace this with an Array-extending class, or something, to avoid a
	//   slow Object.defineProperty every time.
	Object.defineProperty(ret,'who',{enumerable:false,value:'me'});
	var iters = Array.prototype.map.call(arguments,r =>
		(r[Symbol.iterator] ? r[Symbol.iterator]() : r));
	while (true) {
		i = 0;
		for (var it of iters) {
			//console.log('it',typeof it,it);
			if ((a=it.next()).done)
				return;
			ret[i++] = a.value;
		}
		yield ret;
	}
}
M.izip_longest = function * izip_longest() {
	for (var r of izip_longest.reference.apply(this,arguments))
		yield new Array(r);
}
M.izip_longest.reference = function * izip_longest_reference() {
	var a,i=0;
	var ret = new Array(arguments.length -
		(typeof arguments[0] === 'object' ? 1 : 0));
	var fill = undefined;
	var failCount;
	// TODO: define's here, too.
	Object.defineProperty(ret,'who',{enumerable:false,value:'me'});
	var iters = Array.prototype.map.call(arguments,r =>
		(r[Symbol.iterator] ? r[Symbol.iterator]() : r));
	while (true) {
		i = 0;
		failCount = 0;
		for (var it of iters) {
			failCount += ((a=it.next()).done ? 1 : 0);
			if (failCount === ret.length)
				return;
			ret[i++] = a.value;
		}
		yield ret;
	}
}

M.compress = function * compress(data,selectors) {
	for (var r of M.izip.reference(data,selectors))
		if (r[1])
			yield r[0];
}

M.dropwhile = function * dropwhile(check,r) {
	r = (r[Symbol.iterator] ? r[Symbol.iterator]() : r);
	for (var a of r) {
		if (check(a)) 
		{ yield a; break; }
	}
	for (var a of r)
		yield a;
}

// TODO: groupby() looks complex, will get to it, later.
M.groupby = function * groupby(whatevs) {

}

M.ifilter = function * ifilter(check,r) {
	for (var a of r)
		if (check(a))
			yield a;
}
M.ifilterfalse = function * ifilterfalse(check,r) {
	for (var a of r)
		if (!check(a))
			yield a;
}

M.islice = function * islice(r,start=0,stop=null,step=1) {
	r = (r[Symbol.iterator] ? r[Symbol.iterator]() : r);
	var i,a;
	for (i=0; i < start; ++i)
		r.next();
	if (stop !== null)
		for (; i < stop && !(a=r.next()).done; i += step) {
			yield a.value;
			for (var j=0; j < step-1; ++j)
				r.next();
		}
	else
		for (; !(a=r.next()).done; i += step) {
			yield a.value;
			for (var j=0; j < step-1; ++j)
				r.next();
		}
}

M.imap = function * imap() {
	var f = arguments[0];
	for (var r of M.izip.reference.apply(null,Array.from(M.islice(arguments,1))))
		yield f.apply(null,r);
}

M.starmap = function * starmap(f,r) {
	for (var args of r)
		yield f.apply(null,args);
}

// TODO: Not sure how this one is meant to be implemented...
M.tee = function * tee() {
	
}

M.takewhile = function * takewhile(f,r) {
	for (var a of r) {
		if (!f(a))
			break;
		yield a;
	}
}


})(module.exports);



