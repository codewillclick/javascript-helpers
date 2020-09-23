
var exports =
	(typeof module !== 'undefined') ?
		module.exports :
	(typeof window !== 'undefined') ?
		(window.exports = {}) : {};

((M) => {

// Wrapper of sorts around local/sessionStorage.

function Table(storage) {
	var table = this
	Object.defineProperties(this, {
		storage: {
			get:()=>storage
		},
		get: {
			enumerable:false,
			value:(k) => {
				var v = storage.getItem(k)
				return v === null ? null : JSON.parse(v)
			}
		},
		set: {
			enumerable:false,
			value:(k,v) => storage.setItem(k,JSON.stringify(v))
		},
		node: {
			enumerable:false,
			value:(k,delay) => {
				return new Node(table,k,delay)
			}
		}
	})
}
M.Table = Table

// All this junk is for DynamicTable, which stores javascript objcets in a
// serialized fashion.  
var dtableCode    = '\uf001'
var dtableSpecial = '\uf002'
var dtableSpecialTable = {
	'\uf002null':null,
	'\uf002NaN':NaN,
	'\uf002undefined':undefined
}
var defaultConversions = Object.freeze({
	Function:[
		(a) => {
			return a.toString()
		},
		(s) => {
			if (/^function[^{]*{/.test(s)) {
				// Standard function.
				var m = s.match(/^function\s*\(([^)]*)\)\s*{(.*)}\s*$/)
				var args = m[1].split(',')
				args.push(m[2])
				return Function.apply(null,args)
			}
			else if (/^\([^)]*\)\s*=>/.test(s)){
				// Arrow function.
				var m = s.match(/^\(([^)]*)\)\s*=>\s*(.*)$/)
				var args = m[1].split(',')
				if (/^{/.test(m[2]))
					// Curly braces, so pass as-is, but without the curly braces.
					args.push(m[2].replace(/^{(.*)}\s*$/,'$1'))
				else
					// Prepend with 'return'.
					args.push('return '+m[2])
				return Function.apply(null,args)
			}
		}
	]
})
function keyString(k) {
	// Returns sort-of hash string 6 chars long.
	// WARNING: 6 chars isn't long enough for near certainty of hash uniqueness.
	// NOTE:  Hm... this needs to never change ever to keep compatible between
	//   versions.  Also, wrote this while still thinking functions could be
	//   passed around like keys.  Not so.
	var v = 0
	var upperLimit = 0x7fffffff
	var limit = 0xffffff
	for (var c of k) {
		var a = c.charCodeAt(0)
		v += a
		v *= a
		v %= upperLimit
	}
	var s = (v%limit).toString(16)
	for (var i=s.length; i < 6; ++i)
		s = '0'+s
	return s
}
function DynamicTable(storage,conversions) {
	var table = this
	
	// Build conversion table on top of defaultConversions.
	var conv = Object.assign(Object.assign({},defaultConversions),conversions)
	var ctable = {} // for unique key strings
	var ctable2 = {} // hexed string as key, conv[*] as val
	for (var k in conv) {
		var f = window[k]
		if (typeof f !== 'function')
			throw new Error(
				'conversions must have functions (classes) as key values: ' +
				(typeof f) + ', ' + f)
		ctable[k] = '[:'+keyString(f.name)+':]'
		ctable2[ctable[k]] = conv[k]
	}
	
	function getter(k) {
		// Get and deserialize string using conversion table.
		var json = JSON.parse(storage.getItem(k))
		
		function rec(a) {
			if (typeof a === 'string') {
				// May be convertible, so check.
				var r,k;
				if (a[0] === dtableCode) {
					// It's convertible.  Check for special values.
					if (a[1] === dtableSpecial)
						// It's a special value.
						return dtableSpecialTable[a.slice(1)]
					else if (r=ctable2[k=a.slice(1,11)]) {
						// It's a convertible, so convert.
						return r[1](a.slice(11))
					}
					else
						// Seems the found dtableCode has nothing to do with converting.
						// Return string as-is.
						return a
				}
				else
					return a
			}
			else if (typeof a === 'object') {
				// Just iterate through and assign rec()'d values per key.
				for (var k in a)
					a[k] = rec(a[k])
				return a
			}
			else
				// Not a string, so not something serialized.  Just pass back normally.
				return a
		}	
		return rec(json)
	}
	function setter(k,v) {
		// Serialize and set string vaue using conversion table.
		
		function rec(a) {
			// if object
			var r,s;
			if (a === null) {
				return dtableCode + dtableSpecial + 'null'
			}
			else if (a === undefined) {
				return dtableCode + dtableSpecial + 'undefined'
			}
			else if (a.constructor && (r=conv[a.constructor.name])) {
				// if in table
				s = ctable[a.constructor.name]
				var res = r[0](a)
				if (typeof res === 'string')
					return dtableCode + s + r[0](a)
				else
					// for cases where an object instead of a serialization is returned
					return rec(res)
			}
			else if (typeof a === 'object') {
				// if an array
				if (Array.isArray(a)) {
					var r = new Array(a.length)
					for (var i in a)
						r[i] = rec(a[i])
					return r
				}
				// if a plain boring object
				else {
					var ob = {}
					for (var k in a)
						ob[k] = rec(a[k])
					return ob
				}
			}
			else if (typeof a === 'number' && isNaN(a)) {
				return dtableCode + dtableSpecial + 'NaN'
			}
			// only literals are left, I guess...
			else {
				return a
			}
		}

		var a = rec(v)
		//console.log('set,a',a)
		storage.setItem(k,JSON.stringify(a))
	}
	Object.defineProperties(this, {
		storage: {
			get:()=>storage
		},
		get: {
			enumerable:false,
			value:getter
		},
		set: {
			enumerable:false,
			value:setter
		},
		node: {
			enumerable:false,
			value:(k,delay) => {
				return new Node(table,k,delay)
			}
		}
	})
}
M.DTable = M.DynamicTable = DynamicTable

// A Node acts as a convenient accessor to an object stored under a single key.
// NOTE: I originally meant this to split an object across many key/val pairs,
//   but that was an annoying problem to think about, so I just made it act on
//   a single object, with an optional delay param as a hack against changing
//   many vals at a time.
function Node(table,key,delay) {
	var saveWait = false
	function delayedSet() {
		if (saveWait)
			return
		saveWait = true
		setTimeout(() => {
			saveWait = false
			table.set(key,ob)
		},delay)
	}
	var ob = table.get(key)
	var kr = Object.keys(ob)
	var p = {}
	// NOTE: defineProperties is called only once, so this object should not have
	//   new key assignments or key deletions.  Only values can safely change.
	for (var k of kr) {
		p[k] = {
			set:((k) => ((v) => {
				ob[k] = v
				if (delay)
					delayedSet()
				else
					table.set(key,ob)
			}))(k),
			get:((k) => (() => {
				return ob[k]
			}))(k),
			enumerable:true
		}
	}
	Object.defineProperties(this,p)
}
// }

})(exports)

