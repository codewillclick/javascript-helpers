function Clock(parentClock)
{
	if (!parentClock)
		parentClock = Clock.prototype;
	
	var totalPaused = 0;
	var pauseStart = 0;
	var paused = false;
	
	Object.defineProperty(this,'paused',{
		enumerable:false,
		configurable:true,
		get:function(){ return paused }
	});
	
	Object.defineProperty(this,'pauseTotal',{
		enumerable:false,
		configurable:true,
		get:function(){
			if (this.paused)
				return totalPaused
					+ parentClock.time
					- pauseStart;
			else
				return totalPaused;
		}
	});
	
	Object.defineProperty(this,'time',{
		enumerable:false,
		configurable:true,
		get:function(){
			return parentClock.time - this.pauseTotal;
		}
	});
	
	this.pause = function(){
		paused = true;
		pauseStart = parentClock.time;
	};
	this.unpause = function(){
		totalPaused += parentClock.time - pauseStart;
		paused = false;
	};
}

Clock.prototype = {
	get time(){ return new Date().getTime(); },
	get paused(){ return false; },
	get pauseTotal(){ return 0; },
	get parentClock(){ return null; },
	pause:function(){},
	unpause:function(){}
};


function Timer(millis,clock,loop)
{
	clock = (typeof clock === 'undefined' ? new Clock() : clock);
	loop = (typeof loop === 'undefined' ? false : loop);
	
	var startTime = null;
	var pileup = 0;
	
	Object.defineProperty(this,'millis',{
		enumerable:false,
		configurable:false,
		writable:false,
		value:millis
	});
	
	Object.defineProperty(this,'start',{
		enumerable:false,
		configurable:true,
		writable:false,
		value:function(){
			startTime = clock.time;
		}
	});
	
	Object.defineProperty(this,'startTime',{
		enumerable:false,
		configurable:true,
		writable:false,
		value:startTime
	});
	
	Object.defineProperty(this,'rawProgress',{
		enumerable:false,
		configurable:true,
		writable:false,
		value:function(){
			if (startTime === null)
				return 0;
			return (clock.time - startTime) / this.millis;
		}
	});
	
	Object.defineProperty(this,'progress',{
		enumerable:false,
		configurable:true,
		writable:false,
		value:function(){
			if (startTime === null)
				return 0;
			if (loop)
			{
				var a = (clock.time - startTime) / this.millis;
				if (a >= 1.)
					pileup = Math.floor(a);
				return a - Math.floor(a);
			}
			else
			{
				if (clock.time >= startTime + this.millis)
					return 1;
				return (clock.time - startTime) / this.millis;
			}
		}
	});
}

