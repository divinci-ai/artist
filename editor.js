const canvas = document.getElementById('editor');
const context = canvas.getContext('2d'); 
const save = document.getElementById('save'); 
const editButton = document.getElementById('edit_button');
const promptImg = document.getElementById('image');

canvas.width = 864; 
canvas.height = 864; 


const images = [];
const drawCanvas = () => {
    let image = images[0];
    let mat = cv.imread(image);
    
    cv.imshow('editor',mat,50, 50);
    // context.clearRect(0, 0, canvas.width, canvas.height);
    // images.forEach(image => context.drawImage(image, Number(image.getAttribute('x')), Number(image.getAttribute('y')), 512, 512));
    // const scannedImage = context.getImageData(0,0, 512, 512);
    // console.log(scannedImage);
    // const scannedData = scannedImage.data;
}

const addImage = () => {
    
    const image = new Image();
    image.src = promptImg.src;
    image.setAttribute('x', Math.random()*50); 
    image.setAttribute('y', Math.random()*50)
    images.push(image);
    drawCanvas();
}
const saveDrawing = () => {
    canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    var anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = "IMAGE.PNG";
    anchor.click();
};

   
let draggable = false; 
canvas.addEventListener('click', function(event){
    draggable = true;
    // draw(event.offsetX, event.offsetY); 
});

canvas.addEventListener('mouseup', function(event){
    images.forEach(image => {
        console.log("changing position")
        // event.offSetX
        image.setAttribute('x', event.offsetX);
        image.setAttribute('y', event.offsetY);
    })
    drawCanvas();
})


const draw = (x, y) => {
    context.font="50px Comic Sans MS"
    context.fillText('Hello world', x, y);
}


save.addEventListener('click', saveDrawing);

editButton.addEventListener('click', addImage);

