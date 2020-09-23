
var exports =
	(typeof module !== 'undefined') ?
		module.exports :
	(typeof window !== 'undefined') ?
		(window.exports = {}) : {};

((M) => {

function Timer(tfunc) {
	this.vals = []
	if (tfunc)
		this.tfunc = tfunc
	else if (performance && performance.now)
		this.tfunc = (() => performance.now())
	else
		this.tfunc = (() => new Date().getTime())
}
Timer.prototype.mark = function(m) {
	var n = this.tfunc()
	this.vals.push([m,n])
	return this
}
Timer.prototype.total = function() {
	return this.vals[this.vals.length-1][1] - this.vals[0][1]
}
Timer.prototype.reset = function() {
	this.vals = [] 
}
Timer.prototype[Symbol.iterator] = function * () {
	var r = this.vals
	for (var i=1; i < r.length; ++i)
		yield [r[i][0], r[i][1]-r[i-1][1]]
}
M.Timer = Timer

})(exports)


