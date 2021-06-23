/**
 * Constants
 */
const FPS = 60;
const colors = ["red", "green", "blue", "orange", "yellow", "purple", "pink"];
const Direction = Object.freeze({"UP":-1, "DOWN":1, "RIGHT":1, "LEFT":-1});

const clamp = function(value, min, max) { return Math.max(min, Math.min(max, value)); }

const checkCollision_CircleRectangle = function(circle, rectangle) {
    var closestX = clamp(circle.x, rectangle.x, rectangle.x + rectangle.width - 1);
    var closestY = clamp(circle.y, rectangle.y, rectangle.y + rectangle.height - 1);
    var distanceX = circle.x - closestX;
    var distanceY = circle.y - closestY;
    var distance = Math.sqrt(distanceX*distanceX + distanceY*distanceY);
    return distance < circle.getRadius();
}

/**
 * Debug
 */
var DEBUG = false;
var rays = [];


/**
 * Component abstract class.
 */
class Component {

    update() {}
    render() {}

}


/******************************************************************************************/
/******************************************* INPUTS ***************************************/

/**
 * Keyboard class. Registers the keyboard inputs.
 */
 class Keyboard {

    constructor(game) {

        this.game = game;

        this.KEY_SPACE = false;
        this.KEY_RIGHT = false;
        this.KEY_LEFT = false;

        document.addEventListener('keydown', (evt) => this.onKeyPressed(evt));
        document.addEventListener('keyup', (evt) => this.onKeyReleased(evt));
    }

    onKeyPressed(evt) {

        if (evt.code == "Escape" && !evt.repeat) {
            this.game.onPausePressed();
            return;
        }

        this.KEY_SPACE = evt.code == "Space" || this.KEY_SPACE;
        this.KEY_RIGHT = evt.code == "ArrowRight" || this.KEY_RIGHT;
        this.KEY_LEFT = evt.code == "ArrowLeft" || this.KEY_LEFT;
    }

    onKeyReleased(evt) {
        this.KEY_SPACE = !(evt.code == "Space" || !this.KEY_SPACE);
        this.KEY_RIGHT = !(evt.code == "ArrowRight" || !this.KEY_RIGHT);
        this.KEY_LEFT = !(evt.code == "ArrowLeft" || !this.KEY_LEFT);
    }

}


/******************************************************************************************/
/************************************  AUXILAR SCREENS ************************************/

/**
 * AuxilarScreen class. The auxilar screen of the game.
 */
class AuxilarScreen {

    constructor(text1, text2) {
        this.screen = document.getElementById("auxilarScreen");
        this.screen.style.display = "none";
        this.text1Div = document.getElementById("auxilarScreenText1");
        this.text2Div = document.getElementById("auxilarScreenText2");

        this.text1 = text1;
        this.text2 = text2;
    }

    show() {
        this.text1Div.childNodes[0].nodeValue = this.text1;
        this.text2Div.textContent = this.text2;
        this.screen.style.display = "";
    }

    hide() {
        this.screen.style.display = "none";
    }

}

/**
 * PauseScreen class. The pause screen of the game.
 */
class PauseScreen extends AuxilarScreen {
    constructor() {
        super("PAUSED", '(Press "Esc")');
    }
}

/**
 * GameOverScreen class. The "game over" screen of the game.
 */
 class GameOverScreen extends AuxilarScreen {
    constructor() {
        super("GAME OVER", '(Press "F5" to try again)');
    }
}

/**
 * WinScreen class. The "you won" screen of the game.
 */
class WinScreen extends AuxilarScreen {
    constructor() {
        super("YOU WON!", '(Press "F5" to play again)');
    }
}


/******************************************************************************************/
/**************************************** GAME STATES *************************************/

/**
 * State abstract class.
 */
class State {

    constructor(game) {
        this.game = game;
    }

    update() {}
    onPausePressed() {}

}

/**
 * PausedState class. The paused state of the game.
 */
class PausedState extends State {

    constructor(game) {
        super(game);
    }

    onPausePressed() { this.game.resumeGame(); }

}

/**
 * RunningState class. The running state of the game.
 */
class RunningState extends State {

    constructor(game) {
        super(game);
    }

    update(deltaTime) {

        var game = this.game;
        var keyboard = game.keyboard;

        game.checkWinState();

        game.components.forEach(function(component) {
            component.update(keyboard, deltaTime);
        })
    }

    onPausePressed() { this.game.pauseGame(); }

}

/**
 * GameOverState class. The "game over" state of the game.
 */
class GameOverState extends State {}

/**
 * WinState class. The "you won" state of the game.
 */
 class WinState extends State {}


/******************************************************************************************/
/**************************************** COMPONENTS **************************************/

/**
 * Class Rect.
 */
 class Rect {

    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getLeftMost() {
        return this.x;
    }
    getRightMost() {
        return this.x + this.width - 1;
    }
    getTopMost() {
        return this.y;
    }
    getDownMost() {
        return this.y + this.height - 1;
    }
    getCenter() {
        return [this.x + this.width / 2, this.y + this.height / 2];
    }

}

/**
 * MainScreen class. The game screen.
 */
 class MainScreen extends Component {

    constructor() {
        super();
        this.canvas = document.getElementById("canvas");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    render(ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this.width, this.height);
    }
 
}

/**
 * Ball class. The game ball.
 */
class Ball extends Component {

    constructor(game, screen, paddle, board) {

        super();
        this.game = game;
        this.screen = screen;
        this.paddle = paddle;
        this.board = board;

        // Position
        this.radius = 5;
        this.oldX = null;
        this.oldY = null;
        this.x = null;
        this.y = null;
        this.ATTACHED = true;

        // Movement
        this.X_SPEED = 0.5;
        this.Y_SPEED = 0.5;
        this.MAX_ANGLE = 0.4 * Math.PI;
        this.angle = 2 * Math.PI; 
        this.xDirection = Direction.RIGHT;
        this.yDirection = Direction.UP;

        // Others
        this.lineWidth = 2;
    }

    render(ctx) {
        ctx.fillStyle = "black";
        ctx.shadowColor = "rgba(0, 0, 0, 0)";
        ctx.shadowBlur = 0;
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = this.lineWidth;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    getLeftMost() {
        return this.x - this.getRadius();
    }
    getOldLeftMost() {
        return this.oldX - this.getRadius();
    }
    getRightMost() {
        return this.x + this.getRadius();
    }
    getOldRightMost() {
        return this.oldX + this.getRadius();
    }
    getTopMost() {
        return this.y - this.getRadius();
    }
    getOldTopMost() {
        return this.oldY - this.getRadius();
    }
    getDownMost() {
        return this.y + this.getRadius();
    }
    getOldDownMost() {
        return this.oldY + this.getRadius();
    }
    getRadius() {
        return this.radius + this.lineWidth / 2;
    }

    update(keyboard, deltaTime) {

        if (keyboard.KEY_SPACE) {
            this.unattachToPaddle();
        }

        this.move(deltaTime);
        this.checkCollision();
        rays.push([this.x, this.y]);
    }

    move(deltaTime) {
        this.oldX = this.x;
        this.oldY = this.y;

        if (this.ATTACHED) {
            this.moveWithPaddle();
        } else {
            this.x += this.X_SPEED * Math.sin(this.angle) * this.xDirection * deltaTime;
            this.y += this.Y_SPEED * Math.cos(this.angle) * this.yDirection * deltaTime;
        }
    }

    moveWithPaddle() {
        this.x = this.paddle.rect.x + (this.paddle.rect.width / 2);
        this.y = this.paddle.rect.y - this.getRadius();
    }

    attachToPaddle() {
        this.ATTACHED = true;
    }

    unattachToPaddle() {
        this.ATTACHED = false;
    }

    checkCollision() {

        var self = this;

        // If the ball is attached to the paddle there's no need to check for collision
        if (this.ATTACHED) return;

        // Check for collision with the walls
        var MIN_X = 0;
        var MAX_X = this.screen.width - 1;

        if (this.getLeftMost() < MIN_X) {
            this.x = this.getRadius();
            this.xDirection = Direction.RIGHT;
            return;
        }
        if (this.getRightMost() > MAX_X) {
            this.x = MAX_X - this.getRadius();
            this.xDirection = Direction.LEFT;
            return;
        }

        // Check collision with the blocks
        var blockDestroyed = null;
        this.board.getActiveBlocks().forEach(function(block) {
            if (checkCollision_CircleRectangle(self, block.rect)) {
                block.isDestroyed = true;
                blockDestroyed = block;
                return;
            }
        });
        if (blockDestroyed != null) {

            var blockTopMost = blockDestroyed.rect.getTopMost();
            var blockDownMost = blockDestroyed.rect.getDownMost();
            var blockLeftMost = blockDestroyed.rect.getLeftMost();
            var blockRightMost = blockDestroyed.rect.getRightMost();

            if (this.getTopMost() < blockDownMost && this.getOldTopMost() >= blockDownMost) {
                this.y = blockDownMost + this.getRadius();
                this.yDirection = Direction.DOWN;
            } else if (this.getDownMost() > blockTopMost && this.getOldDownMost() <= blockTopMost) {
                this.yDirection = Direction.UP;
                this.y = blockTopMost - this.getRadius();
            } else if (this.getLeftMost() < blockRightMost && this.getOldLeftMost() >= blockRightMost) {
                this.xDirection = Direction.RIGHT;
                this.x = blockRightMost + this.getRadius();
            } else if (this.getRightMost() > blockLeftMost && this.getOldRightMost() <= blockLeftMost) {
                this.xDirection = Direction.LEFT;
                this.x = blockLeftMost - this.getRadius();
            }

            return;
        }


        if (this.yDirection == Direction.UP) {

            // Check collision with the roof
            var MIN_Y = 0;
            if (this.getTopMost() < MIN_Y) {
                this.y = this.getRadius();
                this.yDirection = Direction.DOWN;
                return;
            }

        } else if (this.yDirection == Direction.DOWN) {

            // Check collision with the paddle
            if (this.checkCollisionWithPaddle()) return;

            // Check collision with the ground (Game Over)
            var MAX_Y = this.screen.height - 1;
            if (this.getDownMost() > MAX_Y) {
                this.y = this.screen.height - this.getRadius();
                this.game.gameOver();
            }
        }

    }

    checkCollisionWithPaddle() {

        var collision = checkCollision_CircleRectangle(this, this.paddle.rect);

        if (collision) {

            var diff = this.x - this.paddle.rect.getCenter()[0];
            this.xDirection = diff < 0 ? Direction.LEFT : Direction.RIGHT;

            // Collision was with the top part
            if (this.getDownMost() > this.paddle.rect.y && this.getOldDownMost() <= this.paddle.oldRect.y) {

                var newY = this.paddle.rect.y - this.getRadius();
                //var xIncrement = Math.abs(this.y - newY) / Math.tan(this.angle);
                //this.x += xIncrement;
                this.y = newY;
                this.yDirection = Direction.UP;

                // Calculate new angle
                var distanceFromCenter = Math.abs(diff);
                var maxDistance = (this.paddle.rect.width / 2) + this.getRadius();
                var factor = distanceFromCenter / maxDistance;
                this.angle = 2 * Math.PI + factor * this.MAX_ANGLE;

            // Collision was with a lateral part
            } else {
                this.x = diff < 0 ? this.paddle.rect.getLeftMost() - this.getRadius() : this.paddle.rect.getRightMost() - this.getRadius();
            }
        }

        return collision;
    }

}

/**
 * Class Paddle. The game paddle.
 */
class Paddle extends Component {

    constructor(screen) {
        super();
        this.screen = screen;

        var width = 70;
        var height = 10;
        const V_PADDING = 40;

        this.oldRect = new Rect(
            screen.width / 2 - width / 2,
            screen.height - height / 2 - V_PADDING,
            width,
            height
        );
        this.rect = new Rect(
            screen.width / 2 - width / 2,
            screen.height - height / 2 - V_PADDING,
            width,
            height
        );

        this.speed = 0.5;
    }

    render(ctx) {
        ctx.fillStyle = "black";
        ctx.shadowColor = '#d53';
        ctx.shadowBlur = 3;
        ctx.lineJoin = 'bevel';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#30f';
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
    }

    update(keyboard, deltaTime) {
        this.move(keyboard, deltaTime);
        this.checkCollision();
    }

    move(keys, deltaTime) {

        if ((!keys.KEY_LEFT && !keys.KEY_RIGHT) || (keys.KEY_LEFT && keys.KEY_RIGHT)) {
            return false;
        }

        this.oldRect.x = this.rect.x;
        this.oldRect.y = this.rect.y;

        var direction = keys.KEY_LEFT ? Direction.LEFT : Direction.RIGHT;
        this.rect.x += this.speed * direction * deltaTime;

        return true;
    }

    checkCollision() {
        const MIN_X = 0;
        const MAX_X = this.screen.width - this.rect.width - 1;
        if (this.rect.x < MIN_X) this.rect.x = MIN_X;
        else if (this.rect.x > MAX_X) this.rect.x = MAX_X;
    }

}

/**
 * Class Block.
 */
 class Block {

    constructor(x, y, width, height, color) {
        this.isDestroyed = false;
        this.rect = new Rect(x, y, width, height);
        this.color = color;
    }

}

/**
 * Class Board.
 */
class Board extends Component {

    constructor(screen) {
        super();
        this.blocks = Stage1.getBlocks(screen);
    }

    getActiveBlocks() {
        return this.blocks.filter(function(block) { return !block.isDestroyed; });
    }

    render(ctx) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        this.getActiveBlocks().forEach(function(block) {
            ctx.fillStyle = block.color;
            ctx.fillRect(block.rect.x, block.rect.y, block.rect.width, block.rect.height);
            ctx.strokeRect(block.rect.x, block.rect.y, block.rect.width, block.rect.height);
        });
    }

}

/**
 * Class Stage1.
 */
class Stage1 {

    static getBlocks(screen) {

        var ROWS = 3;
        var COLUMNS = 15;
        var blockWidth = screen.width / COLUMNS;
        var blockHeight = 100 / ROWS;

        var blocks = [];
        for (let row = 0; row < ROWS; row++) {
            for (let column = 0; column < COLUMNS; column++) {
                blocks.push(new Block(
                            column * blockWidth,
                            row * blockHeight,
                            blockWidth,
                            blockHeight,
                            colors[row]));
            }
        }

        return blocks;
    }

}

/**
 * Game class. The manager class of the game.
 */
 class Game {

    constructor() {

        // Inputs
        this.keyboard = new Keyboard(this);

        // Auxilar Screens
        this.pauseScreen = new PauseScreen();
        this.gameOverScreen = new GameOverScreen();
        this.winScreen = new WinScreen();

        // Components
        this.screen = new MainScreen();
        this.board = new Board(this.screen);
        this.paddle = new Paddle(this.screen);
        this.ball = new Ball(this, this.screen, this.paddle, this.board);
        this.components = [this.screen, this.board, this.paddle, this.ball];

        // State
        this.state = new RunningState(this);

        // Other
        this.ctx = this.screen.canvas.getContext("2d");
        this.lastUpdate = Date.now();
        this.loopID = null;
    }

    start() {
        // By default, loop is executed 60 times per second
        this.loopID = setInterval(() => this.loop(), 1000/FPS);
    }

    loop() {
        var deltaTime = this.tick();
        this.update(deltaTime);
        this.render(deltaTime);
    }

    tick() {
        var timeNow = Date.now();
        var deltaTime = timeNow - this.lastUpdate;
        this.lastUpdate = timeNow;

        return deltaTime;
    }

    update(deltaTime) {
        this.state.update(deltaTime);
    }

    render() {

        var ctx = this.ctx;
        this.components.forEach(function(component) { 
            component.render(ctx); 
        });

        // Debug rendering
        if (DEBUG && rays.length > 0) {
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = "green";
            this.ctx.beginPath();
            this.ctx.moveTo(rays[0][0], rays[0][1]);
            var self = this;
            rays.forEach(function(point) { 
                self.ctx.lineTo(point[0], point[1]);
            });
            this.ctx.stroke();
        }
    }

    onPausePressed() {
        this.state.onPausePressed();
    }

    pauseGame() {
        this.state = new PausedState(this);
        this.pauseScreen.show();
    }

    resumeGame() {
        this.state = new RunningState(this);
        this.pauseScreen.hide();
    }

    gameOver() {
        this.state = new GameOverState();
        this.render();
        clearInterval(this.loopID);
        var self = this;
        setTimeout(function() { self.gameOverScreen.show(); }, 100);
    }

    checkWinState() {
        if (this.board.getActiveBlocks().length == 0) this.win();
    }

    win() {
        this.state = new WinState();
        this.render();
        clearInterval(this.loopID);
        var self = this;
        setTimeout(function() { self.winScreen.show(); }, 100);
    }

}


/** ~!~ %&&             MAIN           &&% ~!~ **/

function main() {
    new Game().start();
}
main();
