class Layer {
  constructor(layerTitle, image) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.pos_x = 0;
    this.pos_y = 0;
    this.context = this.canvas.getContext("2d");
    this.context.drawImage(image, 0, 0);
    this.imageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.title = layerTitle;
  }
}

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const save = document.getElementById("save");
const editButton = document.getElementById("edit_button");
const promptImg = document.getElementById("image");
const toolbar = document.getElementById("toolbar");
const toolbarItems = document.querySelectorAll(".toolbar_item");
const layers = document.getElementById("layers");
const body = document.getElementById("editor_container");
const canvasContainer = document.getElementById("canvas_container");
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

const drawCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  layerMap.forEach((layer) =>
    context.putImageData(layer.imageData, layer.pos_x, layer.pos_y)
  );
};

const addImage = () => {
  const image = new Image();
  image.src = promptImg.src;
  image.width = 1024;
  image.height = 1024;
  let layerTitle = `Layer ${++layerCount}`;
  layerMap.set(layerTitle, new Layer(layerTitle, image));
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
const saveDrawing = () => {
  canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
  var anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = "IMAGE.PNG";
  anchor.click();
};

canvas.addEventListener("mouseup", function (event) {
  if(!spanning){
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

canvas.addEventListener("mousedown", (event) => {
  if (spaceDown) {
    setStartPoints(event);
    panning = true;
  } else if (mode == "crop") lassoCropEventHandler(event);
  else if (mode == "move") moveEventHandler(event);
});

canvas.addEventListener("mousemove", function (event) {
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
  let xs = (e.clientX - pointX) / scale
  let ys = (e.clientY - pointY) / scale
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
  event.preventDefault();
  if (event.ctrlKey) {
    console.log("ctrl");
  } else if (event.key == " ") {
    canvas.style.cursor = "grab";
    spaceDown = true;
  }
});

document.addEventListener("keyup", function (event) {
  event.preventDefault();
  if (event.key == " ") {
    canvas.style.cursor = "auto";
    spaceDown = false;
  }
});
