var left = document.createElement("img");
left.className = "left";
left.src = "visual-assets/left-arrow-green.png";
left.setAttribute("onClick", "moveDown(this.className,10)");
document.body.appendChild(left);


function moveDown(node) { // px per second
    console.log(node);

    $("." + node).animate({
        marginTop: "+=45%",
    }, 5000);
}