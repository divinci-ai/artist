class Layer {
  constructor(layerTitle) {
    this.title = layerTitle;
  }
}

class ImageLayer extends Layer {
  constructor(layerTitle, image) {
    super(layerTitle);
    this.image = image;
    this.canvas = document.createElement("canvas");
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.pos_x = 0;
    this.pos_y = 0;
    this.width = image.width;
    this.height = image.height;
    this.context = this.canvas.getContext("2d");
    this.context.drawImage(image, 0, 0);
    this.imageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }
}
class DrawableLayer extends Layer {
  constructor(layerTitle, pos_x, pos_y, width, height, fill) {
    super(layerTitle);
    this.width = width;
    this.height = height;
    this.fill = fill;
    this.pos_x = pos_x;
    this.pos_y = pos_y;
  }
}

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const save = document.getElementById("save_button");
const editButton = document.getElementById("edit_button");
const promptImg = document.getElementById("image");
const toolbar = document.getElementById("toolbar");
const toolbarItems = document.querySelectorAll(".toolbar_item");
const layers = document.getElementById("layers");
const body = document.getElementById("editor_container");
const canvasContainer = document.getElementById("canvas_container");
const productForm = document.getElementById('create_product_form'); 

let mode = "crop";
let scale = 1;

context.imageSmoothingEnabled = false;
canvas.width = 10000;
canvas.height = 10000;
let layerCount = 0;
let points = [];
let spaceDown = false;
let panning = false;
let start = { x: 0, y: 0 };
let pointX = 0;
let pointY = 0;
const layerMap = new Map();
layerMap.set("design", new DrawableLayer("design", 2000, 2000, 4500, 5100));

const drawCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  layerMap.forEach((layer) => {
    if (layer instanceof ImageLayer) drawImage(layer);
    else if (layer instanceof DrawableLayer) draw(layer);
  });
};

const drawImage = (layer) => {
  context.putImageData(layer.imageData, layer.pos_x, layer.pos_y);
};

const draw = (layer) => {
  context.beginPath();
  context.fillStyle = "grey";
  context.fillRect(layer.pos_x, layer.pos_y, layer.width, layer.height);
  context.stroke();
};

const addImage = () => {
  const image = new Image();
  image.src = promptImg.src;
  image.width = 1024;
  image.height = 1024;
  let layerTitle = `Layer ${++layerCount}`;
  layerMap.set(layerTitle, new ImageLayer(layerTitle, image));
  const layer = document.createElement("div");
  const layer_img = document.createElement("img");
  const layer_title = document.createElement("h6");
  const layer_delete_button = document.createElement("button");
  layer_delete_button.addEventListener("click", () => {
    deleteLayer(layerTitle);
    layers.removeChild(layer);
  });
  layer_delete_button.innerText = "delete";
  layer_title.innerText = layerTitle;
  layer_img.src = image.src;
  layer_img.height = 64;
  layer_img.width = 64;
  layer_img.style = "display:inline;";
  layer_title.style = "display:inline;";
  layer.appendChild(layer_img);
  layer.appendChild(layer_title);
  layer.appendChild(layer_delete_button);
  layer.className = "inactive";
  layer.title = layerTitle;
  layer.addEventListener("click", () => {
    if (layer.className === "active") layer.className = "inactive";
    else if (layer.className === "inactive") layer.className = "active";
  });
  layers.appendChild(layer);
  drawCanvas();
};

const deleteLayer = (layerTitle) => {
  layerMap.delete(layerTitle);
  drawCanvas();
};
const getSelectedLayers = () => {
  const selectedLayers = [];

  [...layers.children].forEach((layer) => {
    if (layer.className === "active")
      selectedLayers.push(layerMap.get(layer.title));
  });
  return selectedLayers;
};

const lassoCropEventHandler = (event) => {
  if (
    points.length > 0 &&
    Math.abs(event.offsetX - points[0].x) < 5 &&
    Math.abs(event.offsetY - points[0].y) < 5
  ) {
    lassoDraw(true);
  } else {
    points.push({ x: event.offsetX, y: event.offsetY });
    lassoDraw(false);
  }
};

const lassoDraw = (dash) => {
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "white";
  if (dash === true) context.setLineDash([5, 5]);
  else context.setLineDash([]);
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawCanvas();
  context.beginPath();
  points.forEach((point) => {
    context.lineTo(point.x, point.y);
  });
  if (dash === true) {
    context.closePath();
    lassoCrop();
  } else context.stroke();
};

const lassoCrop = () => {
  let selectedLayers = getSelectedLayers();
  selectedLayers.forEach((layer) => {
    layer.context.globalCompositeOperation = "destination-out";
    layer.context.beginPath();
    points.forEach((point) => {
      console.log(`x is ${point.x} and y is ${point.y}`);
      let x = point.x - layer.pos_x;
      let y = point.y - layer.pos_y;
      console.log(`x is ${x} and y is ${y}`);
      layer.context.lineTo(x, y);
    });
    layer.context.closePath();
    layer.context.fill();
    layer.imageData = layer.context.getImageData(
      0,
      0,
      layer.canvas.width,
      layer.canvas.height
    );
  });
  drawCanvas();
  points.splice(0, points.length);
};

const moveEventHandler = (event) => {
  const layers = getSelectedLayers();
  layers.forEach((layer) => {
    layer.click_posx = event.offsetX - layer.pos_x;
    layer.click_posy = event.offsetY - layer.pos_y;
  });
  drawCanvas();
};

const setStartPoints = (event) => {
  start = { x: event.clientX - pointX, y: event.clientY - pointY };
};

const setTransform = () => {
  canvas.style.transform =
    "translate(" + pointX + "px, " + pointY + "px) scale(" + scale + ")";
};
// const saveDrawing = (c) => {
//   // c.toDataURL("image/png").replace("image/png", "image/octet-stream");
//   var anchor = document.createElement("a");
//   anchor.href = c.toDataURL("image/png");
//   anchor.download = "rageCage.PNG";
//   anchor.click();
// };
// const getUploadURL = async () => {
//   let response = {};
//   try{
// response = await fetch('http://localhost:8787',{
// method:'POST',
// mode:'no-cors'
//   });
//   }catch(error){
//     console.log(error);
//   }https://divinci.shop/api/design
//   return response;
// };
const saveDrawing = (c) => {
  c.toBlob((blob)=>{
      // fetch('https://divinci.shop/api/design', {
      fetch('http://localhost:8787',{
    method: "PUT",
    body:blob, 
    
  });
  })
};

const createProduct = (event, c) => {
  const data = new FormData(event.target);
  //TODO: check if all inputs are correct
  c.toBlob((blob)=>{
    fetch('https://divinci.shop/api/product', {
    // fetch('http://localhost:8787',{
  method: "PUT",
  body:blob, 
  headers:{
    title:data.get('title'), 
    price:data.get('price'), 
    description:data.get('description'), 
  }
});
})
}

canvas.addEventListener("mouseup", function (event) {
  if (!panning) {
    if (mode == "move") {
      const layers = getSelectedLayers();
      layers.forEach((layer) => {
        layer.pos_x = event.offsetX - layer.click_posx;
        layer.pos_y = event.offsetY - layer.click_posy;
      });
      drawCanvas();
      image.draggable = false;
    }
  }
});

canvasContainer.addEventListener("mousedown", (event) => {
  if (spaceDown) {
    setStartPoints(event);
    panning = true;
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (spaceDown) return;
  else if (mode == "crop") lassoCropEventHandler(event);
  else if (mode == "move") moveEventHandler(event);
});

canvasContainer.addEventListener("mousemove", function (event) {
  if (panning) {
    pointX = event.clientX - start.x;
    pointY = event.clientY - start.y;
    setTransform();
  }
});

editButton.addEventListener("click", addImage);

toolbarItems.forEach((item) =>
  item.addEventListener("click", () => {
    if (item.className === "toolbar_item active")
      item.className = "toolbar_item inactive";
    else item.className = "toolbar_item active";
    mode = item.getAttribute("value");
  })
);

body.addEventListener("wheel", (e) => {
  e.preventDefault();
  let xs = (e.clientX - pointX) / scale;
  let ys = (e.clientY - pointY) / scale;
  let delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
  delta > 0 ? (scale *= 1.2) : (scale /= 1.2);
  pointX = e.clientX - xs * scale;
  pointY = e.clientY - ys * scale;
  setTransform();
});

body.addEventListener("mouseup", (event) => {
  if (panning) panning = false;
});
document.addEventListener("keydown", function (event) { 
  if (event.ctrlKey) {
    event.preventDefault();
    console.log("ctrl");
  } else if (event.key == " ") {
    event.preventDefault();
    canvasContainer.style.cursor = "grab";
    spaceDown = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    canvasContainer.style.cursor = "auto";
    spaceDown = false;
  }
});

//TODO: add artboard layer
save.addEventListener("click", () => {
  let design = layerMap.get("Layer 1");
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
  tempCanvas.width = design.width;
  tempCanvas.height = design.height;
  tempContext.putImageData(
    context.getImageData(
      design.pos_x,
      design.pos_y,
      design.width,
      design.height
    ),
    0,
    0
  );
  saveDrawing(tempCanvas);
});

productForm.addEventListener('submit', (event) => {
  //TODO: once submit is successful, clear form
  event.preventDefault();
  let design = layerMap.get("design");
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
  tempCanvas.width = design.width;
  tempCanvas.height = design.height;
  tempContext.putImageData(
    context.getImageData(
      design.pos_x,
      design.pos_y,
      design.width,
      design.height
    ),
    0,
    0
  );
  createProduct(event, tempCanvas);
  
})
