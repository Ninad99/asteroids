const FPS = 30; //frames per second
const FRICTION = 0.8; //friction coefficient of space where 0 is no friction and 1 is max friction
const SHIP_SIZE = 30; //ship height in px
const SHIP_EXPLODE_DUR = 0.3; //duration of ship's explosion
const SHIP_THRUST = 4; //acceleration of ship in px per sec per sec
const SHIP_INV_DUR = 2; // duration of ship's invisibility in seconds
const SHIP_BLINK_DUR = 0.1; // duration of ship's blink during invisibility in seconds
const TURN_SPEED = 360; //turn speed in degrees per sec
const ROIDS_NUM = 1; //starting number of asteroids
const ROIDS_SIZE = 100; //starting size of asteroids in px
const ROIDS_SPD = 50; //max starting speed in px per sec
const ROIDS_JAG = 0.4; //jaggedness of the asteroids (0 = none, 1 = lots)
const ROIDS_VERT = 10; //avg number of vertices on each asteroid
const ROIDS_PTS_LGE = 20; //points scored for a large asteroid
const ROIDS_PTS_MED = 50; //points scored for a medium asteroid
const ROIDS_PTS_SML = 100; //points scored for a small asteroid
const SHOW_CENTRE_DOT = false; //show or hide ship's centre dot
const SHOW_BOUNDING = false; //show or hide collision bounding
const LASER_MAX = 10; //maximum no of lasers on screen at once
const LASER_SPD = 500; //speed of lasers in px per sec
const LASER_DIST = 0.4; //max distance laser can travel as fraction of screen width
const LASER_EXPLODE_DUR = 0.1; //duration of the laser's explosion in sec
const TEXT_FADE_TIME = 2.5; //text fade time in sec
const TEXT_SIZE = 40; //font height in px
const GAME_LIVES = 3; //starting number of lives
const MAX_LIVES = 5; //maximum number of lives
const SAVE_KEY_SCORE = "scorehigh"; //save key for local storage of highscore
const SOUND_ON = true;
const MUSIC_ON = true;

/** @type {HTMLCanvasElement} */
var canv = document.getElementById("game_canvas");
var ctx = canv.getContext("2d");

//set up sound effects
var fxLaser = new Sound("sounds/laser.m4a", 5, 0.1);
var fxExplode = new Sound("sounds/explode.m4a", 1, 0.8);
var fxHit = new Sound("sounds/hit.m4a", 5, 0.8);
var fxThrust = new Sound("sounds/thrust.m4a", 1, 0.8);

//set up the music
var music = new Music("sounds/music-low.m4a", "sounds/music-high.m4a");
var roidsLeft, roidsTotal;

//set up the game parameters
var level, roids, ship, text, textAlpha, lives, score, highscore;
newGame();

//event handlers
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

//game loop
setInterval(update, 1000 / FPS);

function createAsteroidBelt(){
  roids = [];
  roidsTotal = (ROIDS_NUM + level) * 7;
  roidsLeft = roidsTotal;
	var x, y;
	for(var i=0; i < ROIDS_NUM + level; i++){
		do{
			x = Math.floor(Math.random() * canv.width);
			y = Math.floor(Math.random() * canv.height);
		}while(distBetweenPoints(ship.x, ship.y, x, y) < ROIDS_SIZE * 2 + ship.r);
		roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE/2)));
	}
}

function destroyAsteroid(index){
  var x = roids[index].x;
  var y = roids[index].y;
  var r = roids[index].r;

  //split the asteroid in two if necessary
  if(r == Math.ceil(ROIDS_SIZE/2)){
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE/4)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE/4)));
    score += ROIDS_PTS_LGE;
  }else if(r == Math.ceil(ROIDS_SIZE/4)){
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE/8)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE/8)));
    score += ROIDS_PTS_MED;
  }else{
    score += ROIDS_PTS_SML;
  }

  //check highscore
  if(score > highscore){
    highscore = score;
    localStorage.setItem(SAVE_KEY_SCORE, highscore);
  }

  //destroy the asteroid
  roids.splice(index, 1);
  fxHit.play();

  //calculate the ratio of remaining asteroids to determine audio
  roidsLeft--;
  music.setAsteroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal);

  //new level when no more asteroids
  if(roids.length == 0){
    level++;
    if(lives < MAX_LIVES){
      lives++;
    }
    newLevel();
  }
}

function distBetweenPoints(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function drawShip(x, y, a, colour = "white"){
  //draw ship
  ctx.strokeStyle = colour;
  ctx.lineWidth = SHIP_SIZE/20;
  ctx.beginPath();
  ctx.moveTo( //nose of ship
    x + ((4/3) * ship.r * Math.cos(a)),
    y - ((4/3) * ship.r * Math.sin(a)),
  );
  ctx.lineTo( //rear left
    x - (ship.r * ((2/3) * Math.cos(a) + Math.sin(a))),
    y + (ship.r * ((2/3) * Math.sin(a) - Math.cos(a)))
  );
  ctx.lineTo( //rear right
    x - (ship.r * ((2/3) * Math.cos(a) - Math.sin(a))),
    y + (ship.r * ((2/3) * Math.sin(a) + Math.cos(a)))
  );
  ctx.closePath();
  ctx.stroke();
}

function explodeShip(){
  ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
  fxExplode.play();
}

function gameOver(){
  ship.dead = true;
  text = "GAME OVER";
  textAlpha = 1.0;
}

function keyDown(/** @type {KeyboardEvent} */ ev){
  if(ship.dead){
    return;
  }

	switch(ev.keyCode){
    case 32: //spacebar (shoots laser)
			shootLaser();
			break;

		case 37: //left arrow (rotate ship left)
			ship.rot = ((TURN_SPEED*Math.PI)/180) / FPS;
			break;

		case 38: //up arrow (thrust ship forward)
			ship.thrusting = true;
			break;

		case 39: //right arrow (rotate ship right)
			ship.rot = -((TURN_SPEED*Math.PI)/180) / FPS;
			break;
	}
}

function keyUp(/** @type {KeyboardEvent} */ ev){
  if(ship.dead){
    return;
  }

	switch(ev.keyCode){
    case 32: //spacebar (allows shooting again)
      ship.canShoot = true;
      break;

		case 37: //left arrow (stop rotate ship left)
			ship.rot = 0;
			break;

		case 38: //up arrow 
			ship.thrusting = false;
			break;

		case 39: //right arrow (stop rotate ship right)
			ship.rot = 0;
			break;
	}
}

function newAsteroid(x, y, r){
  var lvlMult = 1 + (0.1*level);
	var roid = {
		x: x,
		y: y,
		xv: Math.random() * (ROIDS_SPD*lvlMult) / FPS * ((Math.random() < 5) ? 1:-1),
		yv: Math.random() * (ROIDS_SPD*lvlMult) / FPS * ((Math.random() < 5) ? 1:-1),
		r: r,
		a: Math.random() * Math.PI * 2, //radians
		vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT/2),
		offs: []
  };

	//create the vertex offset
	for(var i=0;i<roid.vert;i++){
		roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
	}
	return roid;
}

function newGame(){
  level = 0;
  lives = GAME_LIVES;
  score = 0;

  //spaceship object
  ship = newShip();

  //get highscore from local storage
  var scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
  if(scoreStr === null){
    highscore = 0;
  }else{
    highscore = parseInt(scoreStr);
  }
  newLevel();
}

function newLevel(){
  text = "LEVEL " + (level + 1);
  textAlpha = 1.0;
  createAsteroidBelt();
}

function newShip(){
  return {
    x: (canv.width)/2,
    y: (canv.height)/2,
    r: SHIP_SIZE/2,
    a: (90*Math.PI)/180,
    blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
    blinkNumber: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
    canShoot: true,
    lasers: [],
    dead: false,
    explodeTime: 0,
    rot: 0,
    thrusting: false,
    thrust:{
      x: 0,
      y: 0
    }
  }
}

function shootLaser(){
  //create laser object
  if(ship.canShoot && ship.lasers.length < LASER_MAX){
    ship.lasers.push({ //from the nose of the ship
      x: ship.x + 4/3 * ship.r * Math.cos(ship.a),
      y: ship.y - 4/3 * ship.r * Math.sin(ship.a),
      xv: LASER_SPD * Math.cos(ship.a) / FPS, 
      yv: -LASER_SPD * Math.sin(ship.a) / FPS,
      dist: 0,
      explodeTime: 0,
    });
    fxLaser.play();
  }

  //prevent further shooting
  ship.canShoot = false;
}

function Music(srcLow, srcHigh){
  this.soundLow = new Audio(srcLow);
  this.soundHigh = new Audio(srcHigh);
  this.low = true;
  this.tempo = 1.0; //sec per beat
  this.beatTime = 0; //frames left until next beat

  this.play = function(){
    if(MUSIC_ON){
      if(this.low){
        this.soundLow.play();
      }else{
        this.soundHigh.play();
      }
      this.low = !this.low;
    }
  }

  this.setAsteroidRatio = function(ratio){
    this.tempo = 1.0 - 0.75*(1.0 - ratio);
  }

  this.tick = function(){
    if(this.beatTime === 0){
      this.play();
      this.beatTime = Math.ceil(this.tempo * FPS);
    }else{
      this.beatTime--;
    }
  }
}

function Sound(src, maxStreams = 1, vol = 1.0){
  this.streamNum = 0;
  this.streams = [];
  for(var i = 0; i < maxStreams; i++){
    this.streams.push(new Audio(src));
    this.streams[i].volume = vol;
  }

  this.play = function(){
    if(SOUND_ON){
      this.streamNum = (this.streamNum + 1) % maxStreams;
      this.streams[this.streamNum].play();
    }
  }

  this.stop = function(){
    this.streams[this.streamNum].pause();
    this.streams[this.streamNum].currentTime = 0;
  }
}

function update(){
  var blinkON = ship.blinkNumber % 2 == 0;
  var exploding = ship.explodeTime > 0;

  //tick the music
  music.tick();

	//draw space
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canv.width, canv.height);

	//thrust ship
	if(ship.thrusting && !ship.dead){
		ship.thrust.x += (SHIP_THRUST * Math.cos(ship.a)) / FPS;
    ship.thrust.y -= (SHIP_THRUST * Math.sin(ship.a)) / FPS;
    fxThrust.play();
    
    if(!exploding && blinkON){
      //draw the thruster
      ctx.fillStyle = "red";
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = SHIP_SIZE/10;
      ctx.beginPath();
      ctx.moveTo( //rear left
        ship.x - (ship.r * ((2/3) * Math.cos(ship.a) + 0.5*Math.sin(ship.a))),
        ship.y + (ship.r * ((2/3) * Math.sin(ship.a) - 0.5*Math.cos(ship.a)))
      );
      ctx.lineTo( //rear center (behind the ship)
        ship.x - (ship.r * (2 * Math.cos(ship.a))),
        ship.y + (ship.r * (2 * Math.sin(ship.a)))
      );
      ctx.lineTo( //rear right
        ship.x - (ship.r * ((2/3) * Math.cos(ship.a) - 0.5*Math.sin(ship.a))),
        ship.y + (ship.r * ((2/3) * Math.sin(ship.a) + 0.5*Math.cos(ship.a)))
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      }
    }else{
      //apply friction
      ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
      ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
      fxThrust.stop();
    }

  
  if(!exploding){
    if(blinkON && !ship.dead){
      drawShip(ship.x, ship.y, ship.a);
    }

    // handle blinking
    if(ship.blinkNumber > 0){
      //reduce the blink time
      ship.blinkTime--;

      //reduce the blink number
      if(ship.blinkTime == 0){
        ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
        ship.blinkNumber--;
      }
    }
  }else{
    // draw explosion
    ctx.fillStyle = "darkred";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI *2, false);
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI *2, false);
    ctx.fill();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI *2, false);
    ctx.fill();
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI *2, false);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI *2, false);
    ctx.fill();
  }
  
  if(SHOW_BOUNDING){
    ctx.strokeStyle = "lime";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI *2, false);
    ctx.stroke();
  }

	//draw asteroids
	var x, y, r, a, vert, offs;
	for(var i=0;i<roids.length;i++){
    ctx.strokeStyle = "slategrey";
    ctx.lineWidth = SHIP_SIZE/20;
    
		//get the asteroid properties
		x = roids[i].x;
		y = roids[i].y;
		r = roids[i].r;
		a = roids[i].a;
		vert = roids[i].vert;
		offs = roids[i].offs;

		//draw a path
		ctx.beginPath();
		ctx.moveTo(
			x + r * offs[0] * Math.cos(a),
			y + r * offs[0] * Math.sin(a)
		);

		//draw a polygon
		for(var j=1;j<vert;j++){
			ctx.lineTo(
				x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
				y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
			);
		}
		ctx.closePath();
    ctx.stroke();
    
    if(SHOW_BOUNDING){
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI *2, false);
      ctx.stroke();
    }
  }
  
  if(SHOW_CENTRE_DOT){
    //centre dot
    ctx.fillStyle = "red";
    ctx.fillRect(ship.x-1, ship.y-1, 2, 2);
  }

  //draw the lasers
  for(var i=0;i<ship.lasers.length;i++){
    if(ship.lasers[i].explodeTime == 0){
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE/15, 0, Math.PI * 2, false);
      ctx.fill();
    }else{
      //draw the explosion
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "pink";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }

  //draw the game text
  if(textAlpha >= 0){
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
    ctx.font = "small-caps " + TEXT_SIZE + "px dejavu sans mono";
    ctx.fillText(text, canv.width/2, canv.height*0.75);
    textAlpha -= (1.0 / TEXT_FADE_TIME) / FPS;
  }else if(ship.dead){
    newGame();
  }

  //draw the lives
  var lifeColour;
  for(var i = 0; i < lives; i++){
    lifeColour = exploding && i == lives - 1 ? "red" : "white";
    drawShip(SHIP_SIZE + i * SHIP_SIZE * 1.2, SHIP_SIZE, 0.5 * Math.PI, lifeColour);
  }

  //draw the score
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = TEXT_SIZE + "px dejavu sans mono";
  ctx.fillText(score, canv.width - (SHIP_SIZE/2), SHIP_SIZE); 

  //draw the highscore
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = (TEXT_SIZE*0.75) + "px dejavu sans mono";
  ctx.fillText("Highscore: " + highscore, canv.width/2, SHIP_SIZE); 

  //detect laser hits on asteroids
  var ax, ay, ar, lx, ly;
  for(var i = roids.length - 1; i >= 0; i--){
    //grab the asteroid properties
    ax = roids[i].x;
    ay = roids[i].y;
    ar = roids[i].r;

    //loop over the lasers
    for(var j = ship.lasers.length - 1; j >= 0; j--){
      //grab the laser properties
      lx = ship.lasers[j].x;
      ly = ship.lasers[j].y;

      //detect hits
      if(ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar){
        //remove the asteroid and activate laser explosion
        destroyAsteroid(i);
        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS);
        break;
      }
    }
  }

  //check for asteroid collisions
  if(!exploding){
    if(ship.blinkNumber == 0 && !ship.dead){
      for(var i=0;i<roids.length;i++){
        if(distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r){
          explodeShip();
          destroyAsteroid(i);
          break;
        }
      }
    }

    //rotate ship
    ship.a += ship.rot;

    //move ship
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
  }else{
    ship.explodeTime--;

    //reset the ship after explosion
    if(ship.explodeTime === 0){
      lives--;
      if(lives == 0){
        gameOver();
      }else{
        ship = newShip();
      }
    }
  }

	//handle edge of screen
	if(ship.x < 0 - ship.r){
		ship.x = canv.width + ship.r;
	}else if(ship.x > canv.width + ship.r){
		ship.x = 0 - ship.r;
	}
	if(ship.y < 0 - ship.r){
		ship.y = canv.height + ship.r;
	}else if(ship.y > canv.height + ship.r){
		ship.y = 0 - ship.r;
  }

  //move the lasers
  for(var i = ship.lasers.length - 1; i >= 0; i--){
    //check distance travelled
    if(ship.lasers[i].dist > LASER_DIST * canv.width){
      ship.lasers.splice(i, 1);
      continue;
    }

    //handle the explosion
    if(ship.lasers[i].explodeTime > 0){
      ship.lasers[i].explodeTime--;

      //destroy the laser after the duration is up
      if(ship.lasers[i].explodeTime == 0){
        ship.lasers.splice(i, 1);
        continue;
      }
    }else{
      //moves the laser
      ship.lasers[i].x += ship.lasers[i].xv;
      ship.lasers[i].y += ship.lasers[i].yv;

      //calculate the distance travelled
      ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));
    }

    //handle edge of screen
    if(ship.lasers[i].x < 0){
      ship.lasers[i].x = canv.width;
    }else if(ship.lasers[i].x > canv.width){
      ship.lasers[i].x = 0;
    }
    if(ship.lasers[i].y < 0){
      ship.lasers[i].y = canv.height;
    }else if(ship.lasers[i].y > canv.height){
      ship.lasers[i].y = 0;
    }
  }
  
  //move the asteroids
  for(var i=0;i<roids.length;i++){
    roids[i].x += roids[i].xv;
    roids[i].y += roids[i].yv;

    //handle edge of screeen
    if(roids[i].x < 0 - roids[i].r){
      roids[i].x = canv.width + roids[i].r;
    }else if(roids[i].x > canv.width + roids[i].r){
      roids[i].x = 0 - roids[i].r;
    }

    if(roids[i].y < 0 - roids[i].r){
      roids[i].y = canv.height + roids[i].r;
    }else if(roids[i].y > canv.height + roids[i].r){
      roids[i].y = 0 - roids[i].r;
    }
  }
}