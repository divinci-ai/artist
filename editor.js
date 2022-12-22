class Layer {
  constructor(layerTitle) {
    this.title = layerTitle;
  }
}

class ImageLayer extends Layer {
  constructor(layerTitle, image, posX = 0, posY = 0, scale = 1) {
    super(layerTitle);
    this.image = image;
    this.canvas = document.createElement("canvas");
    this.width = image.naturalWidth;
    this.height = image.naturalHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.posX = posX;
    this.posY = posY;
    this.scale = scale;
    this.context = this.canvas.getContext("2d");
    this.context.drawImage(image, 0, 0);
    this.imageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }
  getScaledWidth() {
    return this.width * this.scale;
  }
  getScaledHeight() {
    return this.height * this.scale;
  }
}

class DrawableLayer extends Layer {
  constructor(layerTitle, posX, posY, width, height, fill, scale = 1) {
    super(layerTitle);
    this.width = width;
    this.height = height;
    this.fill = fill;
    this.posX = posX;
    this.posY = posY;
    this.scale = scale;
  }
  getScaledWidth() {
    return this.width * this.scale;
  }
  getScaledHeight() {
    return this.height * this.scale;
  }
}
let translateX = 0;
let translateY = 0;
const CORNER_WIDTH = 10;
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const save = document.getElementById("save_button");
const promptImg = document.getElementById("image");
const toolbar = document.getElementById("toolbar");
const toolbarItems = document.querySelectorAll(".toolbar_item");
const layers = document.getElementById("layers");
const editorContainer = document.getElementById("editor_container");
const canvasContainer = document.getElementById("canvas_container");
const productForm = document.getElementById("create_product_form");
const backgroundCanvas = document.getElementById("background_canvas");
const txt2imgForm = document.getElementById("txt2img_form");
const txt2imgResults = document.getElementById("prompt_result");

let mode = "move";
let scale = 1;
let dragging = false;
let resizing = false;
let resizeX = 0;
let resieY = 0;
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
const init = () => {
  const tshirtImage = document.createElement("img");
  tshirtImage.src = "tshirt.png";
  layerMap.set("tshirt", new ImageLayer("tshirt", tshirtImage));
  //height is 952
  const px = 1061 / 2 - 450 / 2;
  const py = 0 + 0.2 * 1011;
  layerMap.set(
    "printableArea",
    new DrawableLayer("printableArea", px, py, 450, 510)
  );
  drawCanvas();
};
const drawCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  layerMap.forEach((layer) => {
    if (layer instanceof ImageLayer) drawImage(layer);
    else if (layer instanceof DrawableLayer) draw(layer);
  });
  outlineSelectedLayers();
};

const outlineSelectedLayers = () => {
  const layers = getSelectedLayers();
  layers.forEach((layer) => {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "blue";
    context.lineWidth = 2;
    context.setLineDash([]);
    context.strokeRect(
      getTransformedX(layer.posX),
      getTransformedY(layer.posY),
      layer.getScaledWidth() * scale,
      layer.getScaledHeight() * scale
    );
    drawSelectionCorner(
      getTransformedX(layer.posX),
      getTransformedY(layer.posY)
    );
    drawSelectionCorner(
      getTransformedX(layer.posX + layer.getScaledWidth()),
      getTransformedY(layer.posY)
    );
    drawSelectionCorner(
      getTransformedX(layer.posX),
      getTransformedY(layer.posY + layer.getScaledHeight())
    );
    drawSelectionCorner(
      getTransformedX(layer.posX + layer.getScaledWidth()),
      getTransformedY(layer.posY + layer.getScaledHeight())
    );
  });
};

const drawSelectionCorner = (posX, posY) => {
  context.fillStyle = "white";
  context.strokeStyle = "blue";
  context.fillRect(
    posX - (CORNER_WIDTH * 1) / scale / 2,
    posY - (CORNER_WIDTH * 1) / scale / 2,
    (CORNER_WIDTH * 1) / scale,
    (CORNER_WIDTH * 1) / scale
  );
  context.strokeRect(
    posX - (CORNER_WIDTH * 1) / scale / 2,
    posY - (CORNER_WIDTH * 1) / scale / 2,
    (CORNER_WIDTH * 1) / scale,
    (CORNER_WIDTH * 1) / scale
  );
};
const drawImage = (layer) => {
  context.drawImage(
    layer.canvas,
    getTransformedX(layer.posX),
    getTransformedY(layer.posY),
    layer.getScaledWidth() * scale,
    layer.getScaledHeight() * scale
  );
};

const draw = (layer) => {
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "black";
  context.setLineDash([6]);
  context.strokeRect(
    getTransformedX(layer.posX),
    getTransformedY(layer.posY),
    layer.getScaledWidth() * scale,
    layer.getScaledHeight() * scale
  );
};

const addTshirt = () => {};

const addImage = (image, posX, posY) => {
  image.width = 1024;
  image.height = 1024;
  let layerTitle = `Layer ${++layerCount}`;
  layerMap.set(layerTitle, new ImageLayer(layerTitle, image, posX, posY));
  const layer = document.createElement("div");
  layer.classList.add("layer");
  deselectAllLayers();
  layer.classList.add("selected__layer");
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
  layer.title = layerTitle;
  layer.addEventListener("click", () => {
    if (layer.classList.contains("selected__layer"))
      layer.classList.remove("selected__layer");
    else layer.classList.add("selected__layer");
    drawCanvas();
  });
  layers.appendChild(layer);
  drawCanvas();
};

const deselectAllLayers = () => {
  document
    .querySelectorAll(".selected__layer")
    .forEach((layer) => layer.classList.remove("selected__layer"));
};
const deleteLayer = (layerTitle) => {
  layerMap.delete(layerTitle);
  drawCanvas();
};
const getSelectedLayers = () => {
  const selectedLayers = [];
  document
    .querySelectorAll(".selected__layer")
    .forEach((layer) => selectedLayers.push(layerMap.get(layer.title)));
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
  drawCanvas();
  if (dash === true) context.setLineDash([5, 5]);
  else context.setLineDash([]);
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "white";
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
      let x = point.x - layer.posX;
      let y = point.y - layer.posY;
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
  dragging = true;
  const layers = getSelectedLayers();
  layers.forEach((layer) => {
    layer.click_posx = event.offsetX - layer.posX;
    layer.click_posy = event.offsetY - layer.posY;
  });
  drawCanvas();
};

const resizeEventHandler = (event) => {
  const dx = event.offsetX - resizeX;
  if (dx > 0) {
    getSelectedLayers().forEach((layer) => (layer.scale += 0.01));
    drawCanvas();
  } else if (dx < 0) {
    getSelectedLayers().forEach((layer) => (layer.scale -= 0.01));
    drawCanvas();
  }
};

const startResize = (event) => {
  resizing = true;
  resizeX = event.offsetX;
  resizeY = event.offsetY;
};

const setStartPoints = (event) => {
  start = { x: event.offsetX, y: event.offsetY };
};

const setTranslate = (dx, dy) => {
  translateX += dx / scale;
  translateY += dy / scale;
  drawCanvas();
};

const downloadCanvas = (c) => {
  c.toDataURL("image/png").replace("image/png", "image/octet-stream");
  let anchor = document.createElement("a");
  anchor.href = c.toDataURL("image/png");
  anchor.download = "rageCage.PNG";
  anchor.click();
};

const saveDrawing = (c) => {
  c.toBlob((blob) => {
    // fetch('https://divinci.shop/api/design', {
    fetch("http://localhost:8787", {
      method: "PUT",
      body: blob,
    });
  });
};

const createProduct = (event, c) => {
  const data = new FormData(event.target);
  //TODO: check if all inputs are correct
  c.toBlob((blob) => {
    fetch("https://divinci.shop/api/product", {
      // fetch('http://localhost:8787',{
      method: "PUT",
      body: blob,
      headers: {
        title: data.get("title"),
        price: data.get("price"),
        description: data.get("description"),
      },
    });
  });
};
canvas.addEventListener("mouseup", function (event) {
  if (!panning) {
    if (dragging) dragging = false;
    if (resizing) resizing = false;
  }
});

canvas.addEventListener("mousemove", (event) => {
  if (spaceDown) canvas.style.cursor = "grab";
  else if (resizing) resizeEventHandler(event);
  else if (isPointerOverCorner(event)) canvas.style.cursor = "grab";
  else canvas.style.cursor = "auto";
});

const isPointerOverCorner = (event) => {
  const layers = getSelectedLayers();
  for (const layer of layers) {
    if (
      (Math.abs(event.offsetX - getTransformedX(layer.posX)) <
        CORNER_WIDTH / 2 &&
        Math.abs(event.offsetY - getTransformedY(layer.posY)) <
          CORNER_WIDTH / 2) ||
      Math.abs(
        event.offsetX - getTransformedX(layer.posX + layer.getScaledWidth()) <
          CORNER_WIDTH / 2 &&
          Math.abs(event.offsetY - getTransformedY(layer.posY)) < CORNER_WIDTH / 2
      ) ||
      (Math.abs(event.offsetX - getTransformedX(layer.posX)) <
        CORNER_WIDTH / 2 &&
        Math.abs(
          event.offsetY - getTransformedY(layer.posY + layer.getScaledHeight())) <
            CORNER_WIDTH / 2
        ) ||
      (Math.abs(
        event.offsetX - getTransformedX(layer.posX + layer.getScaledWidth())
      ) <
        CORNER_WIDTH / 2 &&
        Math.abs(
          event.offsetY - getTransformedY(layer.posY + layer.getScaledHeight())
        ) <
          CORNER_WIDTH / 2)
    )
      return true;
    else return false;
  }
};
canvas.addEventListener("drop", (event) => {
  const image = new Image();
  image.src = event.dataTransfer.getData("Text");
  addImage(image, event.offsetX, event.offsetY);
});

canvas.addEventListener("dragover", (event) => {
  event.preventDefault();
  return false;
});
canvasContainer.addEventListener("mousedown", (event) => {
  if (spaceDown) {
    setStartPoints(event);
    panning = true;
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (spaceDown) return;
  else if (isPointerOverCorner(event)) startResize(event);
  else if (mode == "crop") lassoCropEventHandler(event);
  else if (mode == "move") moveEventHandler(event);
});

canvasContainer.addEventListener("mousemove", (event) => {
  if (panning) {
    dx = event.offsetX - start.x;
    dy = event.offsetY - start.y;
    start.x = event.offsetX;
    start.y = event.offsetY;
    setTranslate(dx, dy);
  } else if (mode === "move" && dragging) {
    const layers = getSelectedLayers();
    layers.forEach((layer) => {
      layer.posX = event.offsetX - layer.click_posx;
      layer.posY = event.offsetY - layer.click_posy;
    });
    drawCanvas();
  }
});

const ACTIVE_CLASS = "active";

const setMode = (event) => {
  toolbarItems.forEach((item) => item.classList.remove(ACTIVE_CLASS));
  event.target.classList.add(ACTIVE_CLASS);
  mode = event.target.getAttribute("value");
};

toolbarItems.forEach((item) => {
  item.addEventListener("click", setMode);
});

editorContainer.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.ctrlKey) {
    const original = getOriginal(e.offsetX, e.offsetY);
    let delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
    delta > 0 ? (scale *= 1.2) : (scale /= 1.2);

    translateX = e.offsetX / scale - original.x;
    translateY = e.offsetY / scale - original.y;
    drawCanvas();
  }
});

const getOriginal = (x, y) => {
  const original = { x: x / scale - translateX, y: y / scale - translateY };
  return original;
};

const getTransformedX = (x) => {
  return (x + translateX) * scale;
};

const getTransformedY = (y) => {
  return (y + translateY) * scale;
};

editorContainer.addEventListener("mouseup", (event) => {
  if (panning) panning = false;
  else if (mode == "move" && dragging) dragging = false;
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

txt2imgForm.addEventListener("keydown", (event) => {
  event.stopPropagation();
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
    context.getImageData(design.posX, design.posY, design.width, design.height),
    0,
    0
  );
  saveDrawing(tempCanvas);
});

productForm.addEventListener("submit", (event) => {
  //TODO: once submit is successful, clear form
  event.preventDefault();
  let design = layerMap.get("design");
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
  tempCanvas.width = design.width;
  tempCanvas.height = design.height;
  tempContext.putImageData(
    context.getImageData(design.posX, design.posY, design.width, design.height),
    0,
    0
  );
  createProduct(event, tempCanvas);
});

txt2imgForm.addEventListener("submit", (event) => {
  event.preventDefault();
  data = new FormData(event.target);
  const result = document.createElement("img");
  result.classList.add("txt2img__result");

  result.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("Text", event.target.src);
  });

  fetch(`https://ai.divinci.shop/txt2img?prompt=${data.get("prompt")}&steps=2`)
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .then((objectURL) => {
      result.src = objectURL;
    })
    .then((foo) => {
      txt2imgResults.appendChild(result);
    });
});

//to enable product form to use space
productForm.addEventListener("keydown", (event) => {
  event.stopPropagation();
});

// const updateBackgroundCanvasSize = () => {
//   let cs = getComputedStyle(backgroundCanvas);
//   let width = parseInt(cs.getPropertyValue("width"), 10);
//   let height = parseInt(cs.getPropertyValue("height"), 10);
//   backgroundCanvas.width = width;
//   backgroundCanvas.height = height;
// };

// window.addEventListener("resize", () => {
//   updateBackgroundCanvasSize();
//   drawBackground();
// });
