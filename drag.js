
// author: Cesar A. Longoria II
// copyright (under MIT): 2014-2018

/**
	key: stores these in a table, so a key makes later removal convenient.
	
	mousedown: event on mouse down.
	
	drag: function(e,dragData)
		- e: mousemove event
		- dragData
			  . [key1,key2,...]: arrays of all offsets between element and document.
			  . timing: array of times mousemove was called, in epoch millis.
			  . length: function returning current length of offset data arrays.
			  . diff: function(a,b,index) returning subtraction of offset array data
			      at index between nodes stored under dragData as keys a and b.
			  . first: function(a,b) performing diff with index = 0.
			  . last: function(a,b) performing diff with index = dragData.length-1.
			  . iterDiff: function * (a,b,f,t) iterate diffs between a and b, allowing
			      for a filler iterator to fill gaps due to things like lag.
			  . iterDiffBack: same as above, but moves backwards, from most recent
			      point to oldest.
	
	mouseup: event on mouse up.
	
	relatedNodes: nodes whichs' offsets from document to track and store under
	  their given key names in the dragData object passed to the drag function.
	
	params: eh... extraneous options and parameters...
		- selection: setting params.selection to true will allow the default
		    mousedown behavior.  Otherwise, the actual mousedown listener will
		    always end with { e.preventDefault(); return true; }.
*/

Element.prototype.addDragListener =
	function(key,mousedown,drag,mouseup,relatedNodes,params)
{
	if (!this._dragEvents)
		this._dragEvents = {};
	
	var startFunc;
	var dragFunc;
	var endFunc;
	
	var offsetArrays = {};
	var timingArray = [];
	
	var timingStart = null;
	var timingStartEpoch = null;
	
	for (var i in relatedNodes)
		offsetArrays[i] = [];
	
	var lastDragData = null;
	
	var dragging = false;
	
	var self = this;
	
	var trueOffset = function(node)
	{
		var n = node;
		var off = {x:0,y:0};
		while (n.offsetParent)
		{
			off.x += parseFloat(n.offsetLeft);
			off.y += parseFloat(n.offsetTop);
			n = n.offsetParent;
		}
		return off;
	};
	
	this.dragging = function(){return dragging};
	
	this.addEventListener('mousedown',startFunc=function(e)
	{
		if (dragging)
			return;
		
		dragging = true;
		
		offsetArrays = {mouse:[]};
		timingArray = [];
		timingStart = window.performance.now();
		timingStartEpoch = new Date().getTime();
		
		var timingArrayAccessor = new ImmutableArrayAccessor(timingArray);
		
		// NOTE: Can't seem to decide which key variable name to use...
		for (var k in relatedNodes)
			offsetArrays[k] = [];
		
		var pushCurrent = function(e)
		{
			//timingArray.push(new Date().getTime());
			//var time = new Date().getTime();
			// 
			// NOTE: timing is offset from timingStart, so that timingStartEpoch
			//   remains relevant.
			var now = window.performance.now();
			timingArray.push(now-timingStart);
			
			for (var p in relatedNodes)
				offsetArrays[p].push(trueOffset(relatedNodes[p]));
			
			// NOTE: relatedNodes must not have a key of 'mouse', as it is reserved,
			//   here.
			offsetArrays.mouse.push({
				x:parseFloat(e.pageX), //+ parseFloat(document.body.scrollLeft),
				y:parseFloat(e.pageY) //+ parseFloat(document.body.scrollTop)
			});
		};
		
		// UNCERTAIN: Should I run pushCurrent on mousedown?  I'll go ahead and try.
		pushCurrent(e);
		
		document.addEventListener('mousemove',dragFunc=function(e)
		{
			pushCurrent(e);
			
			var dragData = {
				length:function(){return offsetArrays.mouse.length},
				diff:function(a,b,index)
				{
					return new XYPoint(
						this[a].get(index).x-this[b].get(index).x,
						this[a].get(index).y-this[b].get(index).y
					);
					return {
						x:this[a].get(index).x-this[b].get(index).x,
						y:this[a].get(index).y-this[b].get(index).y
					};
				},
				first:function(a,b){return this.diff(a,b,0)},
				last:function(a,b){return this.diff(a,b,this.length()-1)},
				iterDiff:function * (a,b,filler,triggerDistance) {
					if (!filler)
						for (var i=0; i < offsetArrays.mouse.length; ++i)
							yield this.diff(a,b,i);
					else {
						triggerDistance = triggerDistance || 1;
						// assert mouse.length >= 1, since at least one point is created on
						// initial mousedown.
						var i=0;
						var p1,p2,d;
						p1 = this.diff(a,b,0);
						//console.log('yield very first p1',p1);
						yield p2;
						for (var i=1; i < offsetArrays.mouse.length; ++i) {
							p2 = this.diff(a,b,i);
							//console.log('behesting',i,p2);
							d = Math.sqrt((p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y));
							if (d > triggerDistance) {
								for (var p of filler.call(this,p1,p2,triggerDistance,i))
									yield p;
							}
							//console.log('yield p2',p2);
							yield p2;
							p1 = p2;
						}
					}
				},
				iterDiffBack:function * (a,b,filler,triggerDistance) {
					if (!filler)
						for (var i=offsetArrays.mouse.length-1; i >= 0; --i)
							yield this.diff(a,b,i);
					else {
						triggerDistance = triggerDistance || 1;
						var i=0;
						var p1,p2,d;
						p1 = this.last(a,b);
						//console.log('yield very first p1',p1);
						yield p2;
						for (var i=offsetArrays.mouse.length-1; i >= 0; --i) {
							p2 = this.diff(a,b,i);
							//console.log('behesting',i,p2);
							d = Math.sqrt((p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y));
							if (d > triggerDistance) {
								for (var p of filler.call(this,p1,p2,triggerDistance,i))
									yield p;
							}
							//console.log('yield p2',p2);
							yield p2;
							p1 = p2;
						}
					}
				}
			};
			lastDragData = dragData;
			
			// Accessors are used, as opposed to the original arrays, as they are
			// representative of data *history*, and that must remain unchanged.
			for (var p in offsetArrays)
				dragData[p] = new ImmutableArrayAccessor(offsetArrays[p]);
			dragData.timing = timingArrayAccessor; //new ImmutableArrayAccessor(timingArray);
			dragData.timingStart = timingStartEpoch*1000 + (timingStart%1000);
			
			// Call with Element as 'this' in function.
			self._drag = drag;
			self._drag(e,dragData);
			delete self._drag;
		});
		
		document.addEventListener('mouseup',endFunc=function endFunc(e)
		{
			self._mouseup = mouseup;
			self._mouseup(e,lastDragData);
			delete self._mouseup;
			
			dragging = false;
			document.removeEventListener('mousemove',dragFunc);
			document.removeEventListener('mouseup',endFunc);
		});
		
		self._dragEvents[key].dragFunc = dragFunc;
		self._dragEvents[key].endFunc = endFunc;
		
		// Run the mousedown function.
		pushCurrent(e);
		this._mousedown = mousedown;
		this._mousedown(e);
		delete this._mousedown;
		
		// Prevent highlight selection, by default.
		if (!params || !params.selection)
		{
			e.preventDefault();
			return false;
		}
	});
	
	this._dragEvents[key] = {startFunc:startFunc};
};

Element.prototype.removeDragListener = function(key)
{
	var a = this._dragEvents[key];
	this.removeEventListener('mousedown',a.startFunc);
	document.removeEventListener('mousemove',a.dragFunc);
	document.removeEventListener('mouseup',a.endFunc);
}


function XYPoint(x,y) {
	this.x = x;
	this.y = y;
}
XYPoint.prototype.toString = function() {
	return this.x+','+this.y;
};

// These are called with context of 'this' belonging to a dragData object being
// passed back on a mousedown or mousemove.
DragFiller = {
	step:function * (a,b,triggerDistance,index) {
		if (!triggerDistance)
			return;
		//console.log('DragFiller.step',a,b,triggerDistance,index);
		// NOTE: This doesn't yet account for timing.
		//
		// TODO: Concoct a funciton that will iterate the calculated timing 
		//   intervals, as well.
		var d = Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y));
		var count = Math.floor(d / triggerDistance);
		var jump = d/count;
		var interval = {x:(b.x-a.x)/count,y:(b.y-a.y)/count};
		//console.log('interval,count',interval,count);
		var x = a.x;
		var y = a.y;
		for (var i=0; i < count-1; ++i) {
			x += interval.x;
			y += interval.y;
			//var ret = {x:Math.floor(x),y:Math.floor(y)};
			var ret = new XYPoint(Math.floor(x),Math.floor(y));
			//console.log('yielding',ret,$j([a,b,triggerDistance,index]));
			yield ret;
		}
	}
};



// NOTE: This is really more to prevent accidents than enforce strict behavior.
//   Nothing particularly immutable about an object's '.arr' property.  I
//   could've used a local scope variable and assigned each function in the
//   constructor, but it's slower.
//
//   Also, using this at all may make this library less friendly to use.  May
//   rethink in the future.
function ImmutableArrayAccessor(arr)
{
	this.arr = arr;
}

ImmutableArrayAccessor.prototype.get = function(index)
{ return this.arr[index]; };

ImmutableArrayAccessor.prototype.length = function()
{ return this.arr.length; };

ImmutableArrayAccessor.prototype.concat = function()
{ return Array.prototype.concat.apply(this.arr,arguments); };

ImmutableArrayAccessor.prototype.join = function(sep)
{ return this.arr.join(sep); };

ImmutableArrayAccessor.prototype.slice = function(a,b)
{ return this.arr.slice(a,b); };

ImmutableArrayAccessor.prototype.toString = function()
{ return this.arr.toString(); };

ImmutableArrayAccessor.prototype.toLocaleString = function()
{ return this.arr.toLocaleString(); };

ImmutableArrayAccessor.prototype.indexOf = function(val,from)
{ return this.arr.indexOf(val,from); };

ImmutableArrayAccessor.prototype.lastIndexOf = function(val,from)
{ return this.arr.lastIndexOf(val,from); };

ImmutableArrayAccessor.prototype.forEach = function(callback,thisVal)
{ return this.arr.forEach(callback,thisVal); };

ImmutableArrayAccessor.prototype.every = function(callback,thisVal)
{ return this.arr.every(callback,thisVal); };

ImmutableArrayAccessor.prototype.some = function(func,thisVal)
{ return this.arr.some(func,thisVal); }

ImmutableArrayAccessor.prototype.filter = function(func,thisVal)
{ return this.arr.filter(func,thisVal); };

ImmutableArrayAccessor.prototype.map = function(func,thisVal)
{ return this.arr.map(func,thisVal); };

ImmutableArrayAccessor.prototype.reduce = function(func,initialVal)
{ return this.arr.reduce(func,initialVal); };

ImmutableArrayAccessor.prototype.reduceRight = function(func,initialVal)
{ return this.arr.reduceRight(func,initialVal); };

ImmutableArrayAccessor.prototype[Symbol.iterator] = function()
{ return this.arr[Symbol.iterator](); }

