/*
var left = document.createElement("img");
left.className = "left";
left.src = "visual-assets/left-arrow-green.png";
left.setAttribute("onClick", "moveDown(this.className,10)");
document.body.appendChild(left);
*/


var gameModel = Stapes.subclass();

var gameView = Stapes.subclass({
    constructor: function(model) {
        var self = this;
        var score = 0;
        this.left = document.getElementsByClassName("left down target")[0];
        this.right = document.getElementsByClassName("right down target")[0];
        this.model = model;

        this.arrows = [];


        this.on('start', function() { // redefine arrows here

            setUpArrows("instructions/sample_instructions.txt");
        });


        this.on('left', function() {

            var near = nearest(this.arrows, true);
            score += near[1];
            black(this.arrows[near[0]]);
            this.emit('delete', this.arrows[near[0]]);
            console.log(this.arrows[near[0]]);
            console.log("You added " + near[1] + " points to your score which is now: " + score);
        });

        this.on('right', function() {

            var near = nearest(this.arrows, false);
            score += near[1];
            black(this.arrows[near[0]]);
            this.emit('delete', this.arrows[near[0]]);
            console.log(near[0]);
            console.log("You added " + near[1] + " points to your score which is now: " + score);
        });


        this.on('delete', function(i) {
            //            this.arrows[i].hidden = true;
            //this.arrows.splice(i, 1);
            this.arrows[i] = 0;
        });


    }
});


var gameController = Stapes.subclass({
    constructor: function() {
        var self = this;
        this.model = new gameModel();
        this.view = new gameView(this.model);

    },

    'LEFT': function() {

        this.view.emit('left');
    },

    'RIGHT': function() {

        this.view.emit('right');
    },

    'START': function() {
        this.view.emit('start');
    }
});

var controller = new gameController();

function black(dom) {
    dom.style.backgroundColor = "black";

}

function nearest(arrows, left) { //true if left, false if right

    var nearest = [-1, 1000000]; // var 0 = index, var 1 = distance
    var i = 0;
    arrows.forEach(function(arrow) {
        console.log(arrow + " " + i)
        if (left) {
            if (arrow.className == "left" && (controller.view.left.y - arrow.y) < nearest[1]) {
                nearest[0] = i;
                nearest[1] = controller.view.left.y - arrow.y;
            }
        } else {
            if (arrow.className == "right" && (controller.view.left.y - arrow.y) < nearest[1]) {
                nearest[0] = i;
                nearest[1] = controller.view.left.y - arrow.y;
            }
        }
        i++;
    })
    return nearest;
}

function moveDown(nodeId) { // px per second
    console.log("Node:  " + nodeId);
    var node = $("#" + nodeId);
    node.animate({
        marginTop: "+=45%",
    }, 5000);

    setTimeout(function() {
        node.remove();
        controller.view.emit("delete", nodeId);
    }, 5025);
}


function moveLeArrows(arrows, times) {
    var i = 0;
    arrows.forEach(function(arrow) {
        setTimeout(function() {
            moveDown(arrow.id);
            arrow.hidden = false;
        }, times[i]);
        i++;
    });
}

function playGame(event) {
    console.log(event.key);
    if (event.key == "ArrowLeft") {
        controller.LEFT();
    } else {
        controller.RIGHT();
    }
}


function start() { // power rangers, roll out!
    controller.START();
    document.getElementById("keyPress").focus();
}

function setUpArrows(file) { // set up a bunch of timeout things
    var text = readTextFile(file);
    console.log(text);
    var arrows = [];
    var times = [];

    var textArray = text.split('\n');
    var id = 0;


    for (var i = 0; i < textArray.length; i++) {
        var lineArray = textArray[i].split(" ");

        var arrow = document.createElement("img");
        if (lineArray[1] == 0) {
            arrow.className = "left";
            arrow.src = "visual-assets/left-arrow-green.png";


        } else {
            arrow.className = "right";
            arrow.src = "visual-assets/right-arrow-green.png";
        }
        arrow.id = id;
        arrow.hidden = true;
        document.body.appendChild(arrow);

        //    setTime
        controller.view.arrows[i] = arrow;
        times[i] = lineArray[0] * 1000;
        id++;

    }

    moveLeArrows(controller.view.arrows, times);


}


function readTextFile(file) {
    var rawFile = new XMLHttpRequest();
    var allText;
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                allText = rawFile.responseText;


            }
        }
    }
    rawFile.send(null);
    return allText;
}