
var exports =
	(typeof module !== 'undefined') ?
		module.exports :
	(typeof window !== 'undefined') ?
		(window.exports = {}) : {};

((M,mark) => {

// Get an object that contains an iterator func to run through all [point,val]
// elements within an image data source.
// . so far handles array, 2d array, and iterator
function sourceData(r,w,h) {
	function haveWH() {
		if (typeof w === 'undefined' || typeof h === 'undefined')
			return false
		return true
	}
	var ret = {iter:null}
	if (Array.isArray(r)) {
		// UNCERTAIN: Does keeping a single yield return object reference make it
		//   faster or am I better served with the simplicity of creating a new pair
		//   array every time?
		var t,p = [t=[null,null],null] 
		if (haveWH()) {
			// r is a single array, wherein w,h are needed.
			ret.w = w
			ret.h = h
			ret.iter = function * () {
				for (var i=0; i < h; ++i) {
					t[1] = i
					for (var j=0; j < w; ++j) {
						t[0] = j
						p[1] = r[i*w + j]
						yield p }}}
		}
		// r is a 2d array, where every row is the same length;
		else {
			w = r[0].length
			h = r.length
			ret.w = w
			ret.h = h
			ret.iter = function * () {
				for (var i=0; i < h; ++i) {
					t[1] = i
					for (var j=0; j  < w; ++j) {
						t[0] = j
						p[1] = r[i][j]
						yield p }}}
		}
	}
	else {
		// Attempt iteration.  w,h are needed.
		if (!haveWH())
			throw new Error('for iterable, w,h are needed')
		ret.w = w
		ret.h = h
		ret.iter = function * () {
			for (var a of r)
				yield a
		}
	}
	return ret
}
M.sourceData = sourceData

// Get an image buffer out of image data source.  Uses sourceData.
function imageBuffer(r,...args) {
	// (r,...size,valMap)
	var valMap = typeof args[args.length-1] === 'function' ?
		args[args.length-1] : ((v)=>v)
	var t = args.length >= 2 ?
		sourceData(r,args[0],args[1]) : sourceData(r)
	var w = t.w
	var h = t.h
	var p,v,x;
	var buf = new Uint8ClampedArray(w*h*4) // defaults to 0
	for (var a of t.iter()) {
		p = a[0]
		v = valMap(a[1])
		x = (w*p[1] + p[0]) * 4
		buf[x++] = v[0]
		buf[x++] = v[1]
		buf[x++] = v[2]
		buf[x]   = v[3]
	}
	t.buf = buf
	t.clear = t.clear || (()=>{ for (var k in t) t[k] = null })
	return t
}
M.imageBuffer = imageBuffer

// Create image from image data source and draw to canvas.
// params:
// . canvas: pass in pre-existing canvas
//   . will create new canvas, otherwise
// . antialias: render pixelated
// . scalar: scale up canvas style dimensions (times image w,h)
// . clear: clear canvas before image draw
//   . = true/false, clear or don't clear
//   . = <string>, cx.fillStyle = <string>
//   . = [r,g,b,a], cx.fillStyle = rgba(r,g,b,a)
// . img: uses Image during processing, rather than raw data put
//   . true/false
//   . allows for drawing to blend with existing canvas buffer
//   . slower by a factor of 100 or so, so use with care
async function imageCanvas(...args) {
	// (r,...size,valMap,params)
	var param = (args.length > 2 && typeof args[args.length-1] === 'object') ?
		args[args.length-1] : {}
	var cx,canvas = param.canvas
	// UNCERTAIN: Should I keep it 'alias', or use 'antialias', or 'pixelated'?
	var antialias = typeof param.antialias !== 'undefined' ?
		param.antialias : true
	
	var tim = mark ? new mark.Timer().mark() : null

	// Get source data.
	var t = imageBuffer.apply(null,args.slice(0,args.length-1))
	tim && tim.mark('created image buffer')
	if (!(t.buf instanceof Uint8ClampedArray))
		throw new Error('sourceData failed to produce buf')
	// Work out some canvas style.  Create canvas if none is supplied.
	canvas = canvas || document.createElement('canvas')
	canvas.width = t.w
	canvas.height = t.h
	if (param.scalar) {
		canvas.style.width  = t.w * param.scalar
		canvas.style.height = t.h * param.scalar
	}
	else if (param.size) {
		canvas.style.width = param.size[0]
		canvas.style.height = param.size[1]
	}
	cx = canvas.getContext('2d')
	if (!antialias) {
		canvas.style.imageRendering = 'pixelated'
		cx.imageSmoothingEnabled = false
	}
	tim && tim.mark('created canvas')

	// Create image data and draw to canvas with context2d.  If param.clear is
	// provided, then clear the canvas before drawing (useful if passing the same
	// canvas in for multiple imageCanvas() calls.
	var img,imgp,imdata = cx.createImageData(t.w,t.h)
	imdata.data.set(t.buf)
	if (param.img) {
		// Using img, here, allows for a draw over an existing canvas, vs
		// overwriting canvas data.  Has to be an async function, now, but oh well.
		// Also assures compatibility with param.clear.
		cx.putImageData(imdata,0,0)
		tim && tim.mark('put image data')
		await (imgp = new Promise((ok,bad) => {
			img = new Image()
			img.onload = () => {
				ok(img)
			}
			img.src = canvas.toDataURL('image/png')
			tim && tim.mark('converted to dataurl')
		}))
		tim && tim.mark('img.onload wait')
		if (param.clear)
			cx.clearRect(0,0,t.w,t.h)
	}
	if (param.clear) {
		if (typeof param.clear !== 'boolean') {
			var fs = cx.fillStyle
			try {
				if (typeof param.clear === 'string')
					cx.fillStyle = param.clear
				else if (Array.isArray(param.clear))
					cx.fillStyle = 'rgba('+param.clear.join(',')+')'
				cx.fillRect(0,0,t.w,t.h)
			} finally {
				cx.fillStyle = fs
			}
		}
		else
			cx.clearRect(0,0,t.w,t.h)
	}
	if (param.img) {
		cx.drawImage(img,0,0)
		// Dereference img as best we can.
		img.src = '#'
		img.onload = null
		img = null
	}
	else {
		cx.putImageData(imdata,0,0)
	}
	tim && tim.mark('data written to canvas')

	t.canvas = canvas
	t.cx = cx
	t.clear = t.clear || (()=>{ for (var k in t) t[k] = null })
	if (tim) {
		t.perf = Array.from(tim)
		t.perfTotal = tim.total()
	}
	return t
}
M.imageCanvas = imageCanvas


})(
	exports,
	window && window[document.currentScript.getAttribute('mark')]
)

