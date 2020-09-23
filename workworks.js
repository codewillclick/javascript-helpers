
var exports = (typeof module !== 'undefined') ?
	module.exports : (window.exports = {});

// TODO: Allow importing as string, rather than calling the url every time.

((M) => {

// Used for pulling text from document node.  ... So far, it's just a
// .innerText, so it may not be working keeping this func.
function text(n) {
	if (typeof n === 'string')
		n = document.querySelector(n)
	return n.innerText
}
//M.text = text

// Get url of calling document.
function getURL() {
	return document.URL.replace(/\/[^\/]*$/,'')
}

// Create a Worker from either a string or a single function.
// params:
// - prefix: add prefix to whatever string
// - imports: add importScripts call for provided values
//   . useful since Blob-made Workers can't reference relatives paths
// - wrap: wraps the Worker into a Promise-delivering... Worker
//   . it's kind of a mess, but it seems to work
//   . uses post() as it return method
function createWorker(s,p) {
	if (typeof s === 'function')
		s = 'onmessage = ' + s
	var prefix = ''
	var postfix = ''
	if (p) {
		if (p.prefix)
			prefix += p.prefix+';'
		if (p.postfix)
			postfix += p.postfix
		if (p.imports) {
			// Workers created from Blobs can't do relative url imports.
			var url = getURL()
			if (p.imports.filter(s => /^\w+=/.test(s)).length > 0) {
				// At least one of the imports specifies a var=exports token.
				for (var a of p.imports) {
					var key = a.replace(/^(\w+)=.*/,'$1')
					var val = a.replace(/^\w+=/,'')
					val = /^https?\/\//.test(val) ? val : url+'/'+val
					prefix += 'self.importScripts('+JSON.stringify(val)+');' +
						';\n'
					if (key !== a) // if key=
						prefix += 'var '+key+' = exports;\n'
				}
			}
			else {
				// Straight filenames all the way.
				prefix += 'self.importScripts.apply(self,' + JSON.stringify(
						// Prepend url if it's a relative path; otherwise, leave it alone.
						p.imports.map(s => /^https?\/\//.test(s) ? s : url+'/'+s)
					) + ');'
			}
		}
		if (p.wrap) {
			// This pairs with wrap() function for Promise callbacks.
			
			// NOTE: post() should act like a return statement.
			postfix += ';('+(() => {
				var fs = self.onmessage.toString()
				// Injects post() function, which adds the promise id used in the
				// wrapped Worker's ptable to the returning message's data.  This does,
				// however, limit acceptable message types to key/val-writable objects.
				fs = fs.replace(/^([^{]*{)/,'$1 ' +
					'var _promId = arguments[0].data._promiseId;' +
					'function post() {' +
						'var r = Array.from(arguments);' +
						'r[0]._promiseId = _promId;' +
						'self.postMessage.apply(self,r);' +
					'}; ' +
					'try {')
				// The try {} catch {} block handles the case of *any thrown error
				// whatsoever*, and shoves it into a post() in such a manner as that
				// the wrapped Worker's onmessage will recognize said error, and use
				// the rejection method, as opposed to resolve.
				fs = fs.replace(/(}[^}]*)$/,'} catch(e) {' +
					'post({_promiseError:e})' +
				'} $1')
				// And here's where the actual assign happens.
				// ... Isn't using eval() some kind of cardinal javascript sin?  Well,
				// this is for personal use, so whatever.
				eval('self.onmessage = ' + fs + ';')
			})+')();'
		}
	}
	var w = new Worker(URL.createObjectURL(
		new Blob([prefix+';'+s+'/* here? */;'+postfix],{type:'application/javascript'})))
	return p.wrap ? wrap(w) : w
}
M.createWorker = createWorker

// Some local unique identifier function.
var _uid = 0
function uid() {
	return _uid++
}

// Wrap a Worker object with some number of functions.
function wrap(w) {
	// NOTE: Is this really wrapping anything, though?  It's just adding or
	//   overriding methods...
	
	var ptable = {}
	
	w.onmessage = (e) => { // why 'e'?
		// TODO: How in the world will we handle Promise rejections?
		if (typeof e.data !== 'object')
			throw new Error('onmessage only accetpts object message data')
		var id = e.data._promiseId
		delete e.data._promiseId
		if (!ptable[id])
			throw new Error('There should be '+id+' in ptable, but there is not')
		var r = ptable[id]
		if (e.data._promiseError) {
			// bad()
			r[1](e.data._promiseError)
		}
		else {
			// ok()
			r[0](e.data)
		}
		delete ptable[id]
	}
	
	w.post = function() {
		var args = Array.from(arguments)
		var prid = uid()
		if (typeof args[0] !== 'object')
			throw new Error('post() only accepts object messages')
		args[0]._promiseId = prid
		var p = new Promise((ok,bad) => {
			// TODO: Handle failure, I guess?
			w.postMessage.apply(w,args)
			ptable[prid] = [ok,bad]
		})
		return p
	}
	
	Object.defineProperty(w,'ptable',{get:()=>Object.assign({},ptable),enumerable:false})

	return w
}

// Create a stack of identical Workers to pass messages to.  Behaves like a
// regular or wrapped Worker, using post(), postMessage(), onmessage=, onerror=.
function createWorkerStack(size,...args) {
	// Keep the args for use with createWorker().
	var _id = 0
	var workers = []
	function addWorker() {
		var w = createWorker.apply(null,args)
		var a = {
			worker:w,
			busy:false, // NOTE: Maybe remove busy?  calls takes care of that.
			calls:0,
			id:_id++
		}
		workers.push(a)
	}
	function dropWorker() {
		var i;
		for (i=workers.length-1; i >= 0; --i)
			if (!workers[i].busy)
				break
		if (i < 0)
			throw new Error('no workers available to drop')
		else {
			workers[i].worker.terminate()
			workers.splice(i,1)
		}
	}
	function grabWorker() {
		var r = workers.slice()
		// Sort for least busy each time.
		r.sort((a,b) => a.calls - b.calls)
		return r[0]
	}
	
	// Fill stack with initial workers.
	for (var i=0; i < size; ++i)
		addWorker()
	
	var onmessage,onerror;
	var workerSub = {}

	// Add in a few worker behavior functions.
	Object.defineProperties(workerSub,{
		// Handle wrapped Worker post() behavior.
		// TODO: a.busy only affects wrapped Workers; maybe do something about this?
		post: {
			enumerable:false,
			value:function(...r) {
				// Post to arbitrary Worker.
				var a = grabWorker()
				//console.log('post to',a.id)
				a.busy = true
				a.calls += 1
				return a.worker.post.apply(a.worker,r)
					.then((v) => { a.busy = false; a.calls -= 1; return v })
					.catch((e) => { throw e })
			}
		},
		// Handle standard postMessage() behavior.
		postMessage: {
			enumerable:false,
			value:function(...r) {
				// Post to arbitrary Worker.
				var a = grabWorker()
				return a.worker.postMessage.apply(a.worker,r)
			}
		},
		// onmessage and onerror apply assigns to all Workers in the stack.
		onmessage: {
			get:function() {
				return onmessage
			},
			set:function(v) {
				onmessage = v
				workers.map(a=>a.worker).map(w=>w.onmessage = v)
			}
		},
		onerror: {
			get:function() {
				return onerror
			},
			set:function(v) {
				onerror = v
				workers.map(a=>a.worker).map(w=>w.onerror = v)
			}
		}
	})

	return workerSub
}
M.createWorkerStack = createWorkerStack

})(exports)


