var log = function (s) {
  if(window.Logger)
    Logger.write(s);
  else
    console.log(s);
}

var Brain = {
xLimit : 43,
yLimit : 26,
cellSize : 19,
maxWarmth : 15,
needsInstructions: true,
imagePath: "./images/",

//--------------------------------------------------
init: function () {
  this.buildTransitionColors (
      [[0, 1], [20, 1], [80, .73], [100, .6]],
      [[0, .55], [20, .66], [80, .73], [100, .67]],
      [[0, .2], [20, .35], [80, .73], [100, 1]]
      );
  var c = document.getElementById("braincontainer");
  var self = this;
  this.sliderSet = SliderSet({
      theme: "beige",
      templates: this.sliderTemplate,
      callback: function (whichSlider, mode, value, roundedValue) {
        if (whichSlider == 0) {
          self.synchTerminology(Math.round((value*6.9/100)-.45));
          }
        else if (whichSlider == 1) {
          self.synchRandomness(Math.round((value*5.9/100)-.45))
        }
        else if (whichSlider == 2) {
          self.synchSpeed(Math.round((value*5.9/100)-.45))
        }
      }
    });
  var elem = this.buildUiElements ();
  this.drawGrid();
  this.synchRandomness(3)
  this.synchTerminology(3);
  this.synchSpeed(3)
  c.appendChild (elem);
  this.sliderSet.addAllThumbs();
  },

//-----------------------------------------------------
pushbuttonShowActive : function (button, isDown) {
  button.style.backgroundPosition = ((isDown) ? -51 : 0) + "px 0px";
  },

//-----------------------------------------------------
gridCallback : function (args, type, elem, event) {
    if (this.neuronEvent)
      this.neuronEvent (args, type, elem);
  },

currZ: 5000,

//-----------------------------------------------------
rewardPunish : function (map) {
  var w = 0;
  var grid = this.grid, x, y;
  var xLim = this.xLimit;
  var yLim = this.yLimit;
  var count = 0;
  for (y=0; y<yLim; y++) {
      for (x=0; x<xLim; x++) {
          n = grid[x][y]
          if (n.warmth) {
              count++;
              s = n.size + map[n.warmth];
              if (s <= this.cellSize+5 & s > 0) {
                  n.size = s;
                  this.setNeuronSizeAndPosition (n, x, y);
                  }
              }
          }
      }
  if (count == 0) {
    /*alert ("This won't work unless there are 'warm' (orange) decision paths." +
        ((this.needsInstructions)?" Try clicking a blue button first.":"")); */
    }
  },

//--------------------------------------------------
synchRandomness : function (which) {
  this.weightPow = [2,7,20,50,66,86][which];
  },

//--------------------------------------------------
synchSpeed : function (which) {
  this.speed = [220,120,70,40,20,20][which];
  },

//--------------------------------------------------
synchTerminology : function (which) {
  switch (which) {
    case 0:
      var s1 = "make unhappy";
      var s2 = "make happy";
      break;
    case 1:
      var s1 = "inflict pain";
      var s2 = "give pleasure";
      break;
    case 2:
      var s1 = "punish";
      var s2 = "reward";
      break;
    case 3:
      var s1 = "negatively reinforce";
      var s2 = "positively reinforce";
      break;
    case 4:
      var s1 = "     -     ";
      var s2 = "     +     ";
      break;
    case 5:
      var s1 = "suppress recent decisions";
      var s2 = "reinforce recent decisions";
      break;
    case 6:
      var s1 = "weaken recent neural paths";
      var s2 = "strengthen recent neural paths";
      break;

    }
  this.painButton.value = s1;
  this.pleasureButton.value = s2;
  },

//-----------------------------------------------------
buildUiElements : function () {
  var w = 20+(this.xLimit*20.35);
	var iconWidth = 100;
	var borderWidth = w/2 - iconWidth ;
	var painButton, painIcon, pleasureButton, painIcon, container, table;
	var self = this;
	var callbackPain = function () {
  		self.rewardPunish ([0, -.4, -.55, -.7, -.88, -1.2, -1.5, -1.8,
      -2.1, -2.4, -2.5, -2.7, -2.75, -2.9, -3, -3.5]);
      };
	var callbackPleasure = function () {
    		self.rewardPunish ([0, .4, .55, .7, .88, 1.2, 1.5, 1.8,
      2.1, 2.4, 2.5, 2.7, 2.75, 2.9, 3, 3.5]);
      };


  document.addEventListener ("keypress", function(evt){
      var c;
      if (evt.ctrlKey || evt.metaKey || evt.altKey)
        return true;
      var keyCode = evt.keyCode ? evt.keyCode :
            evt.charCode ? evt.charCode :
            evt.which ? evt.which : 0;
      c = String.fromCharCode(keyCode).toLowerCase();
      if(c=='=')
        callbackPleasure()
      else if (c=='-')
        callbackPain();
    }, false);

	with (DomGenerator) {
    table = TABLE ({style: {margin: "5px"}}, TBODY({style: {border: "0"}},
        TR (
          TD ({colSpan: "4"},
            this.container = DIV (
              {className: "brainRectangle", style: {
                  width: w + "px",
                  height: (20+(this.yLimit*16.5)) + "px", MozBorderRadius: "12", WebkitBorderRadius: "12"}}
            )
          )),
        TR (
          TD (),
          TD ({style: {width: iconWidth + "px", textAlign: "center"}},
            this.painButton = INPUT({onclick: callbackPain, style: {position: "relative"}, type: "button", value: ""})),
          TD ({style: {width: iconWidth + "px", textAlign: "center"}},
            this.pleasureButton = INPUT({onclick: callbackPleasure, style: {position: "relative"}, type: "button", value: ""})),
          TD ()
        ),
        TR (
          TD ({style: {width: (borderWidth)+"px"}}, this.sliderSet.element),
          TD ({className: "iconBox"}, IMG({onclick: callbackPain, src: this.imagePath+"pain.gif", style: {marginLeft: "10px"}})),
          TD ({className: "iconBox"}, IMG({onclick: callbackPleasure, src: this.imagePath+"pleasure.gif", style: {marginLeft: "10px"}})),
          TD({style: {width: (borderWidth)+"px"}},
            DIV ({style: {font: '13px arial', textAlign: 'center', cssFloat: "right", styleFloat: "right", marginRight: "80px"}},
              this.hideNeuronsCheckbox = INPUT ({type: "checkbox", id: "hideNeurons",
                onclick: function () {
                    self.hideNeurons();
                }}),
              LABEL ({htmlFor:"hideNeurons"}, " hide neurons"), BR(),
              INPUT({onclick: function() {
                  self.drawGrid();
                },  type: "button", value: "reset grid" })
              )
            )
          )
      ));
    }
  return table;
	},

//-----------------------------------------------------
buildGrid : function (max, min) {
  var xLim = this.xLimit, yLim = this.yLimit;
	var grid = [], x, y;
	for (x=0; x<xLim; x++)
	  grid[x] = [];
  for (y=0; y<yLim; y++) {
    for (x=0; x<xLim; x++) {
      grid[x][y] = {
        size:  (Math.random()*(max-min))+min,
        shiftX: .5, //Math.random(),
        shiftY: .5, //Math.random(),
        warmth: 0
        };
      }
    }
  this.grid = grid;
  },

//-----------------------------------------------------
gridCoordinatesToPixels: function (x, y) {
	return {
	  x: ((y%2==1)?20:10) + (x*20),
  	y: 10 + (y*16.5)
	  }
  },

//-----------------------------------------------------
setNeuronSizeAndPosition : function (neuron, x, y, z) {
	var size = Math.floor(neuron.size),
		  margin = this.cellSize - size,
		  s = neuron.element.style;
  var pos = this.gridCoordinatesToPixels(x, y);
	s.top = pos.y + Math.floor(neuron.shiftY * margin) + "px";
	s.left = pos.x + Math.floor(neuron.shiftX * margin) + "px";
	s.width =	s.height = size + "px";
	s.zIndex = (60 + size) + "";
	s.WebkitBorderRadius = (Math.floor(size/2)+2) + "px";
	},

//-----------------------------------------------------
illuminateBulb : function (node) {
  if (node.glowCount == 0) {
      var pos = this.gridCoordinatesToPixels(node.x, node.y);
			node.bulbGlow = DomGenerator.IMG ({src: this.imagePath+"bulbglow.png", style: {top: (pos.y - 53) + "px", left: (pos.x - 40) + "px", position: "absolute", zIndex: "200000"}});
			this.container.appendChild (node.bulbGlow);
			}
	node.glowCount++;
	},

//-----------------------------------------------------
deluminateBulb : function (node) {
 	node.glowCount--;
	if (node.glowCount == 0) {
  		this.container.removeChild (node.bulbGlow);
  		delete (node.bulbGlow);
  		}
	},

//-----------------------------------------------------
startWalker : function (node) {
  var self = this;;
  var walker = {
    x: node.x,
    y: node.y,
    history: [],
    dir: 1,
    delay: 70,
    glowBall: this.makeGlowBall(),
    num: Math.round(Math.random(50))+50,
    nodeId: node.id
    };
  var i, elem, item,
      neuralPath = NeuralPath.getPathConstant (node.x, node.y, "outerRingButton");

  var totalWeight = 0;
  for (i=0; i<neuralPath.length; i++) {
    item = neuralPath[i];
    if (item.neuron != null) {
      weight = Math.pow(item.neuron.size, this.weightPow);
      if (item.neuron.warmth > 10)
          weight = 0; //*= .01;
      }
    else
      weight = 0;
    totalWeight += weight;
    item.maxSelectorNum = totalWeight;
    }

  // pick a direction, randomly but weighted
  var selectorNum = Math.random () * totalWeight;
  for (i=0; i<neuralPath.length; i++) {
    item = neuralPath[i];
    if (item.maxSelectorNum > selectorNum) {
      walker.dir = i;
      walker.x = item.x;
      walker.y = item.y;
      e = item.neuron.element;
      e.style.backgroundColor =
          this.transitionColors[this.maxWarmth];
      e.style.zIndex = this.currZ++;
      item.neuron.warmth = this.maxWarmth;
      var pos = DomUtils.getPos(e);
      if (this.neuronsHidden) {
        walker.glowBall.style.display = "none";
        }
      else {
        walker.glowBall.style.display = "";
        walker.glowBall.style.zIndex = this.currZ+5;
        DomUtils.moveElem (walker.glowBall,
            pos.x + e.offsetWidth/2 - 22,
            pos.y + e.offsetHeight/2 - 22)
        }
      walker.history.push (item);
      break;
      }
    }
  setTimeout (function() {
      self.walkSingleStep(walker);
    }, 1);
  document.body.appendChild (walker.glowBall);
  this.needsInstructions = false;
  },

//-----------------------------------------------------
walkSingleStep : function (walker) {
  var i, elem, item,
      neuralPath = NeuralPath.getPathConstant (walker.x, walker.y, "smallRing");

  var self = this;
  var totalWeight = 0;
  var dir = walker.dir;
  for (i=0; i<6; i++) {
    item = neuralPath[i];
    if (item.neuron != null) {
      var size = item.neuron.size;
      // avoid warm neurons
      if (item.neuron.warmth > 10)
        size /= 2;
      // avoid reversing direction
      if ((dir + 3) % 6 == i)
         size /= 1.7;
     /* // avoid going semi-reverse
      else if (((dir + 2) % 6) == i || (dir + 4) % 6 == i)
          weight /= 1.3;
      // log('warmth: ' + item.neuron.warmth + ' weight: ' + weight)
*/
      weight = Math.pow(size, Brain.weightPow);
      }
    else
      weight = 0;

    totalWeight += weight;
    item.maxSelectorNum = totalWeight;
    }
  if (Brain.grid[walker.x][walker.y].test) {
//    if(window.Logger)
 //     Logger.write (neuralPath);
    }
  // pick a direction, randomly but weighted
  var selectorNum = Math.random () * totalWeight;
  for (i=0; i<6; i++) {
    item = neuralPath[i];
    if (item.maxSelectorNum > selectorNum) {
      walker.dir = i;
      walker.x = item.x;
      walker.y = item.y;
      e = item.neuron.element;
      e.style.backgroundColor =
          this.transitionColors[this.maxWarmth];
      e.style.zIndex = this.currZ++;
      item.neuron.warmth = this.maxWarmth;
      pos = DomUtils.getPos (e);
      if (this.neuronsHidden) {
        walker.glowBall.style.display = "none";
        }
      else {
        walker.glowBall.style.display = "";
        walker.glowBall.style.zIndex = this.currZ+5;
        DomUtils.moveElem (walker.glowBall,
            pos.x + e.offsetWidth/2 - 22,
            pos.y + e.offsetHeight/2 - 22);
         }
      walker.history.push (item);
      if (item.neuron.node != null && item.neuron.node.bulb) {
          this.terminateWalker (false, walker, item.neuron.node);
          return;
          }
        break;
        }
    }
  walker.num--;
  if (walker.num <= 1) {
      this.terminateWalker (true, walker, null);
      }
  else
      setTimeout (function () {
          self.walkSingleStep (walker);
        }, this.speed);
  },

//-----------------------------------------------------
terminateWalker: function (isFinal, walker, nodeToIlluminate) {
  var self = this;

  if (isFinal) {
    document.body.removeChild (walker.glowBall);
    this.coolNeuralPath (walker.history, this.maxWarmth-1);

    if (nodeToIlluminate) {
      DomUtils.moveElem (walker.glowBall,
            pos.x + e.offsetWidth/2 - 22,
            pos.y + e.offsetHeight/2 - 22);
      this.illuminateBulb (nodeToIlluminate, walker);
      setTimeout (function() {
           self.deluminateBulb(nodeToIlluminate);
         }, 2000);
      }
    }
  else {
      setTimeout (function() {
          self.terminateWalker(true, walker, nodeToIlluminate);
        }, this.speed);
    }
  },

//-----------------------------------------------------
coolNeuralPath : function (neuralPath, warmth) {
	var tc = this.transitionColors;
	var self = this;
	var i, n, c;
	if (warmth == 0)
		c = "";
	else
		c = tc[warmth];

	for (i=0; i<neuralPath.length; i++) {
		n = neuralPath[i].neuron;
		if (n.warmth == warmth + 1) {
      n.warmth = warmth;
      n.element.style.backgroundColor = c;
      }
		}
	if (warmth > 0)
		setTimeout (function () {
				self.coolNeuralPath(neuralPath, warmth-1);
		}, 500);
	},

//--------------------------------------------------
// interpolates/extrapolates values from a provided table,
// x values of map argument are expected to be in ascending order
getInterpolatedValue : function(x, map) {
	for (var i=0;i<map.length;i++) {
		if ((x<map[0][0])?(x<map[0][0]):(map[i][0]<=x && map[i+1][0]>x) || i==map.length-2) {
			return (map[i][1])+(((x-(map[i][0]))/((map[i+1][0])-(map[i][0])))*((map[i+1][1])-(map[i][1])));
      }
    }
  },

//--------------------------------------------------
//rgb values should be between 0 and 1
rgbToHex: function (rgb) {
    var s = "", hexChars = "0123456789abcdef";
    for (var i=0; i<3; i++) {
      var val = Math.round(rgb[i]*255);
      s += hexChars.charAt((val-val%16)/16) + hexChars.charAt(val%16);
    }
    return s;
  },

//-----------------------------------------------------
buildTransitionColors : function (redMap, greenMap, blueMap) {
  var tc = [];
  var inc = 100 / this.maxWarmth, r, g, b;
  for (var i=100; i>=0; i-=inc) {
      r = this.getInterpolatedValue (i, redMap);
      g = this.getInterpolatedValue (i, greenMap);
      b = this.getInterpolatedValue (i, blueMap);
      tc.push ("#" + this.rgbToHex ([r, g, b]));
      }
  this.maxWarmth = tc.length-1;
  this.transitionColors = tc;
  },

nodeCount : 0,

//-----------------------------------------------------
makeGlowBall : function () {
  with (DomGenerator) {
    glowBall = IMG ({
      className: "glowball",
      src: this.imagePath+"glowball.png"}
      );
    }
  return glowBall;
  },

//-----------------------------------------------------
setButtonEventHandlers: function (node) {
  var self = this;
  node.button.onmousedown = function() {
    self.pushbuttonShowActive (node.button, true);
  };
  node.button.onmouseup = function() {
    self.pushbuttonShowActive (node.button, false);
  };
  node.button.onclick = function() {
    self.startWalker (node);
  };
},

//-----------------------------------------------------
makeNode : function (startX, startY, node) {
  var node = {
    x: startX,
    y: startY,
    id: this.nodeCount
    };
  this.nodeCount++;
  var self = this;
  var type = (this.nodeCount%2 == 0)?"Bulb":"Button";
  var i, elem, n,
      neuralPath = NeuralPath.getPathConstant (startX, startY, "innerArea" + type);

  for (i=0; i<neuralPath.length; i++) {
    n = neuralPath[i].neuron;
    if (n != null) {
      elem = n.element;
      n.size = 0;
      n.isHidden = true;
      if (elem)
        elem.parentNode.removeChild (elem);
      n.element = null;
      //		elem.style.backgroundColor = "#f88";
      //  	elem.style.zIndex = "49";

      }
    }
  var pos = this.gridCoordinatesToPixels (startX, startY);

  if  (type == "Bulb") {
      node.bulb = DomGenerator.IMG (
        {src: this.imagePath+"bulb.gif", style : {
          position: "absolute",
          zIndex: "100",
          left: (pos.x-18)+ "px",
          top: (pos.y-30) + "px"}});
      node.glowCount = 0;
      this.container.appendChild (node.bulb);
      }
  else {
      node.button = DomGenerator.DIV ({
          className: 'pushbutton',
          style: {
             left: (pos.x-15)+ "px",
             top: (pos.y-15) + "px"
             }
          });
      this.setButtonEventHandlers(node);
      this.container.appendChild (node.button);
      }
  neuralPath = NeuralPath.getPathConstant (startX, startY, "outerRing" + type);
  for (i=0; i<neuralPath.length; i++) {
    n = neuralPath[i].neuron;
    if (n != null && !n.isHidden) {
      n.node = node;
      //n.element.style.backgroundColor = "#ff6";
      }
    }
  },

//-----------------------------------------------
addNodes : function (num) {
	var a = [];
	var xMax = this.xLimit-8, yMax = this.yLimit-8;
	var dSquared = 10*10;
	for (var i=0; i<num; i++) {
		for (var k=0; k<500; k++) {
			var failed = false;
			var x = Math.round(Math.random () * xMax);
			var y = Math.round(Math.random () * yMax);
			for (var j=0; j<a.length; j++) {
					var xd = x-a[j][0], yd = y-a[j][1];
					if ((xd * xd + yd * yd) < dSquared) {
							failed = true;
							break;
							}
					}
			if (failed == false) {
					a.push ([x+4, y+4]);
					break;
					}
			}
		}
	for (var i=0; i<a.length; i++) {
			Brain.makeNode (a[i][0], a[i][1]);
			}
	},

//-----------------------------------------------
hideNeurons : function () {
  this.neuronsHidden = (this.hideNeuronsCheckbox.checked)?true:false;
	var grid = this.grid, x, y;
  var xLim = this.xLimit;
  var yLim = this.yLimit;
  for (y=0; y<yLim; y++) {
      for (x=0; x<xLim; x++) {
          n = grid[x][y];
          if (n.element)
            n.element.style.display = (this.neuronsHidden)?"none":"";
          }
      }
	},

//--------------------------------------------------
drawGrid: function () {
  var xLim = this.xLimit;
  var yLim = this.yLimit;
  this.container.innerHTML = "";
  this.buildGrid (3,15);
  var grid = this.grid;
  var x, y, pixelX, pixelY, neuron;
  with (DomGenerator) {
    for (y=0; y<yLim; y++) {
        for (x=0; x<xLim; x++) {
            neuron = grid[x][y];
            neuron.element = DIV ({className: "neuron"});
            if (this.neuronsHidden)
              neuron.element.style.display = "none";
            this.setNeuronSizeAndPosition (neuron, x, y);
            neuron.element.onclick = (function(neuron, x, y, self) {
              return function() {
                    self.neuronClick(neuron, x, y)
                  }
                  })(neuron, x, y, this);
            this.container.appendChild (neuron.element);
            }
        }
     }
  this.addNodes(8);
  },

//-----------------------------------------------------
// the stuff below is not hooked up for "production"
// ....for "drawing" neuralPath descriptions

isWriting : false,

neuronClick : function (neuron, x, y) {
  /*if (this.isWriting) {
    neuron.element.style.backgroundColor = "#f88";
    var xd = x - Brain.last.x;
		var yd = y - Brain.last.y;
		this.setString += "[" + xd + "," + yd + "],<br>";
		this.last = {x: x, y: y};
		}
  else  {
    neuron.element.style.backgroundColor = "#8f8";
    this.isWriting = true;
    //this.last = {x: x, y: y};
    //this.setString = "";
		}
  // neuron.test = true;
  //neuron.size = 18;
  //this.setNeuronSizeAndPosition (neuron, x, y); */
  log(neuron);
  },

sliderTemplate : [
  {
  title: "",
  left: "anthropormorphic",
  right: "clinical",
  tips: [
    "very anthropomorphic",
		"anthropomorphic",
		"a bit anthropomorphic",
		"middle ground",
		"somewhat clinical",
		"clinical",
		"very clinical"
		],
  prompt: "?"
  },
{
  title: "",
  left: "random",
  right: "non-random",
  tips: [
    "very random",
		"random",
		"kinda random",
		"in the middle",
		"not so random",
		"not at all random",
		"very non-random"
		],
  prompt: "?"
  },
{
  title: "",
  left: "slow",
  right: "fast",
  tips: [
		"super slow",
		"slow",
		"a bit sluggish",
		"medium speed",
		"pretty quick",
		"fast",
    "very speedy"
		],
  prompt: "?"
  }
]
};




