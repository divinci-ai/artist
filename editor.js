class Layer {
  constructor(layer) {
    if (layer.id) this.id = layer.id;
    else this.id = crypto.randomUUID();
    this.layerTitle = `Layer ${++layerCount}`;
  }
}

class ImageLayer extends Layer {
  constructor(layer) {
    super(layer);
    this.image = layer.image;
    this.canvas = document.createElement("canvas");
    this.width = layer.image.imgWidth;
    this.height = layer.image.imgHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.posX = layer.posX ? layer.posX : 0;
    this.posY = layer.posY ? layer.posY : 0;
    this.scale = layer.scale ? layer.scale : 1;
    this.context = this.canvas.getContext("2d");
    this.type = "image";
    layer.imageId ? (this.imageId = layer.imageId) : null;
    if (layer.imageCanvas) this.context.drawImage(layer.imageCanvas, 0, 0);
    else this.context.drawImage(layer.image, 0, 0);
  }

  getScaledWidth() {
    return this.width * this.scale;
  }
  getScaledHeight() {
    return this.height * this.scale;
  }
}

class DrawableLayer extends Layer {
  constructor(layer) {
    super(layer);
    this.width = layer.width;
    this.height = layer.height;
    this.fill = layer.fill;
    this.posX = layer.posX;
    this.posY = layer.posY;
    this.scale = layer.scale ? layer.scale : 1;
  }
  getScaledWidth() {
    return this.width * this.scale;
  }
  getScaledHeight() {
    return this.height * this.scale;
  }
}

class Board extends DrawableLayer {
  constructor(layer) {
    super(layer);
    this.layerMap = new Map();
    this.isCollapsed = layer.isCollapsed ? layer.isCollapsed : false;
    this.type = "board";
  }
  toggleIsCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }
}

class Operation {
  constructor(layerID) {
    this.layerID = layerID;
  }
}

class MoveOperation extends Operation {
  constructor(layerID) {
    super(layerID);
  }
}

class CropOperation extends Operation {
  constructor(layerID, cropPoints, scale) {
    super(layerID);
    this.points = cropPoints;
    this.scale = scale;
  }
}

let selectedLayer;
const modelNames = ["ruffbotanic-v3"];
const dragPointer = [];
const pointerCache = [];
const operations = [];
const customerId = crypto.randomUUID();
let translateX = 0;
let translateY = 0;
const CORNER_WIDTH = 10;
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const save = document.getElementById("save_button");
const promptImg = document.getElementById("image");
const toolbar = document.getElementById("toolbar");
const toolbarItems = document.querySelectorAll(".toolbar__item");
const layers = document.getElementById("layers");
const editorContainer = document.getElementById("editor_container");
const canvasContainer = document.getElementById("canvas_container");
const productForm = document.getElementById("create_product_form");
const backgroundCanvas = document.getElementById("background_canvas");
const txt2imgForm = document.getElementById("txt2img_form");
const txt2imgResults = document.getElementById("prompt_result");
const sidebar = document.getElementById("sidebar");
const sidebarGenerate = document.getElementById("sidebar_generate");
const sidebarLayers = document.getElementById("sidebar_layers");
const sidebarProduct = document.getElementById("sidebar_product");
const sidebarSelectionItems = document.querySelectorAll(".sidebar__selection");
const sidebarWindows = document.getElementById("sidebar_windows");
const toolbarCollapseButton = document.getElementById(
  "toolbar_collapse_button"
);

let mode = "pan";
let scale = 1;
let dragging = false;
let resizing = false;
let drawing = false;
let currentDrawingShape = null;
context.imageSmoothingEnabled = false;
canvas.width = 3000;
canvas.height = 3000;
let layerCount = 0;
let points = [];
let spaceDown = false;
let panning = false;
let start = { x: 0, y: 0 };
let pointX = 0;
let pointY = 0;
const layerMap = new Map();
const url = new URL(window.location.href);
let subjectType = url.searchParams.get("subjectType") || "";
let instagramHandle = url.searchParams.get("instagramHandle") || "";

let projectId;
const init = () => {
  const tshirtImage = document.createElement("img");
  tshirtImage.src = "tshirt.png";
  txt2imgForm.appendChild(getGenerateForm());

  if (url.searchParams.get("projectId")) {
    projectId = url.searchParams.get("projectId");
    loadProject(projectId);
  } else projectId = crypto.randomUUID();

  // layerMap.set("tshirt", new ImageLayer("tshirt", tshirtImage));
  //height is 952
  // const px = 1061 / 2 - 450 / 2;
  // const py = 0 + 0.2 * 1011;
  // layerMap.set(
  //   "printableArea",
  //   new DrawableLayer("printableArea", px, py, 450, 510)
  // );
  drawCanvas();
};
const drawCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  layerMap.forEach((layer) => {
    if (layer instanceof Board) drawBoard(layer);
    else if (layer instanceof ImageLayer) drawImage(layer);
    else if (layer instanceof DrawableLayer) draw(layer);
  });
  outlineSelectedLayers();
};

const undo = () => {
  operations.pop();
  drawCanvas();
};

const getLayerOperations = (layer) => {
  const layerOperations = [];
  for (let operation of operations) {
    if (operation.layerID === layer.id) layerOperations.push(operation);
  }
  return layerOperations;
};

const getOperatedCopy = (layer, layerOperations) => {
  const operatedCopy = getDeepCopy(layer);
  layerOperations.forEach((operation) => {
    if (operation instanceof CropOperation) {
      applyCrop(operation, operatedCopy);
    }
  });

  return operatedCopy;
};

const getDeepCopy = (layer) => {
  if (layer instanceof ImageLayer) {
    return new ImageLayer(layer);
  }
};

const refreshLayers = () => {
  layers.replaceChildren();
  layerMap.forEach((layer) => {
    if (layer instanceof Board) {
      addLayerElement(layer);
      if (!layer.isCollapsed)
        layer.layerMap.forEach((l) => {
          addLayerElement(l, true);
        });
    } else {
      addLayerElement(layer);
    }
  });
  updateSelected(layers);
};

const updateSelected = (layers) => {
  layers.childNodes.forEach((child) => {
    if (selectedLayer === child.id) {
      if (child.classList.contains("board"))
        child.classList.add("selected__board");
      else child.classList.add("selected__layer");
    }
  });
};

const addLayerElement = (layer, isChild = false) => {
  const layerDiv = document.createElement("div");
  const layerWrapper = document.createElement("div");
  layerWrapper.classList.add("layer__wrapper");
  let type = "";
  let trainingButton;
  if (layer instanceof Board) {
    type = "board";
    const collapseButton = document.createElement("img");
    collapseButton.src = layer.isCollapsed
      ? "assets/side_arrow.svg"
      : "assets/down_arrow.svg";
    collapseButton.classList.add("layer__component");
    collapseButton.classList.add("collapse__button");
    collapseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      layer.toggleIsCollapsed();
      refreshLayers();
    });
    layerWrapper.appendChild(collapseButton);

    trainingButton = document.createElement("button");
    trainingButton.innerHTML = "train";
    trainingButton.classList.add("layer__component");
    trainingButton.classList.add("training__button");
    trainingButton.addEventListener("click", () => {
      trainBoard(layer);
    });
  } else type = "layer";
  layerDiv.classList.add(type);
  if (isChild) layerDiv.classList.add("child__layer");
  const layerImg = document.createElement("img");
  layerImg.classList.add("layer__component");
  layerImg.classList.add("layer__icon");
  const layerTitle = document.createElement("h6");
  const layerDeleteButton = document.createElement("img");

  layerTitle.classList.add("layer__component");
  layerTitle.classList.add("layer__title");
  layerImg.classList.add("layer__component");
  layerDeleteButton.addEventListener("click", () => {
    deleteLayer(layer.id);
  });
  layerDeleteButton.src = "assets/delete.svg";
  layerDeleteButton.classList.add("layer__delete__button");
  layerDeleteButton.classList.add("layer__component");
  layerTitle.innerText = layer.layerTitle;
  const transformImageButton = document.createElement("img");
  transformImageButton.src = "assets/more.svg";
  transformImageButton.classList.add("layer__component");
  transformImageButton.classList.add("transform__image__button");
  transformImageButton.addEventListener("click", () => {
    event.stopPropagation();
    if (layer.transform) {
      layer.transform = false;
    } else {
      layer.isCollapsed = true;
      layer.transform = true;
    }
    refreshLayers();
  });
  if (layer instanceof ImageLayer) layerImg.src = "assets/image.svg";
  else if (layer instanceof Board) layerImg.src = "assets/board.svg";
  layerImg.style = "display:inline;";
  layerTitle.style = "display:inline;";
  layerWrapper.appendChild(layerImg);
  layerWrapper.appendChild(layerTitle);
  if(layer instanceof ImageLayer){
    const downloadButton = document.createElement("button");
    downloadButton.innerText = "download"; 
    downloadButton.classList.add("layer__component"); 
    downloadButton.addEventListener("click", () => {
      saveLayer(layer.id)});
    layerWrapper.appendChild(downloadButton)
  } 
  layerWrapper.appendChild(transformImageButton);
  layerWrapper.appendChild(layerDeleteButton);
  
  layerDiv.appendChild(layerWrapper);
  if (layer.transform) {
    const transformForm = getTransformForm();
    transformForm.setAttribute("layerID", layer.id);
    layerDiv.appendChild(transformForm);
    if (trainingButton) layerWrapper.appendChild(trainingButton);
  }
  layerDiv.title = layer.layerTitle;
  layerDiv.id = layer.id;
  layerDiv.addEventListener("click", () => {
    if (!false) {
      deselectAllLayers();
      layerDiv.classList.add("selected__" + type);
    } else {
      if (layerDiv.classList.contains("selected__" + type))
        layerDiv.classList.remove("selected__" + type);
      else layerDiv.classList.add("selected__" + type);
    }
    drawCanvas();
  });
  layers.appendChild(layerDiv);
};

const trainBoard = (board) => {
  saveProject();
  const trainingImages = [];
  board.layerMap.forEach((layer) => {
    if (layer instanceof ImageLayer) {
      trainingImages.push(layer.imageId);
    }
  });

  fetch("https://divinci.shop/api/order", {
    method: "PUT",
    body: JSON.stringify({
      customerId: customerId,
      subjectType: subjectType,
      instagramHandle: instagramHandle,
      pipelineStage: "training",
      trainingImages: trainingImages,
      projectId: projectId,
    }),
  });
};

const getForm = () => {
  const transformForm = document.createElement("form");
  const promptInput = document.createElement("input");
  const negativePromptInput = document.createElement("input");
  const stepsInput = document.createElement("input");
  const modelInput = document.createElement("select");
  modelInput.name = "model";
  modelInput.defaultValue = modelNames[0];
  modelNames.forEach((model) => {
    const modelOption = document.createElement("option");
    modelOption.value = model;
    modelOption.innerText = model;
    modelInput.appendChild(modelOption);
  });

  const submitButton = document.createElement("button");
  transformForm.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });
  stepsInput.type = "number";
  stepsInput.name = "steps";

  promptInput.name = "prompt";
  promptInput.placeholder = "prompt";
  promptInput.defaultValue = "";
  const strengthInput = document.createElement("input");
  strengthInput.type = "number";
  strengthInput.step = "any";
  strengthInput.name = "strength";
  strengthInput.placeholder = "strength";
  strengthInput.defaultValue = 0.2;

  const cfgInput = document.createElement("input");
  cfgInput.type = "number";
  cfgInput.name = "cfg";
  cfgInput.placeholder = "cfg";
  cfgInput.step = "any";
  cfgInput.defaultValue = 7.5;

  negativePromptInput.placeholder = "negative prompt";
  negativePromptInput.name = "negativePrompt";
  negativePromptInput.defaultValue = "Ugly, mutilated, bad anatomy, bad face";
  stepsInput.placeholder = "steps";
  stepsInput.defaultValue = 25;
  submitButton.innerText = "submit";
  submitButton.type = "submit";

  transformForm.appendChild(promptInput);
  transformForm.appendChild(negativePromptInput);
  transformForm.appendChild(stepsInput);
  transformForm.appendChild(strengthInput);
  transformForm.appendChild(cfgInput);
  transformForm.appendChild(modelInput);
  transformForm.appendChild(submitButton);
  transformForm.classList.add("transform__form");
  submitButton.classList.add("transform__button");
  return transformForm;
};

const getTransformForm = () => {
  const transformForm = getForm();
  transformForm.addEventListener("submit", (event) => {
    event.preventDefault();
    transformImage(event);
    event.stopPropagation();
  });
  return transformForm;
};

const getGenerateForm = () => {
  const generateForm = getForm();
  generateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generateImage(event);
    event.stopPropagation();
  });
  return generateForm;
};

const generateImage = (event) => {
  data = new FormData(event.target);
  const result = document.createElement("img");
  result.classList.add("txt2img__result");

  result.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("Text", event.target.src);
  });

  result.addEventListener("touchend", (event) => {
    const rect = canvasContainer.getBoundingClientRect();
    const touchX = event.changedTouches[0].clientX;
    const touchY = event.changedTouches[0].clientY;
    if (
      touchX > rect.left &&
      touchY > rect.top &&
      touchX < rect.right &&
      touchY < rect.bottom
    ) {
      addImage(
        result,
        getOriginalX(touchX - rect.left),
        getOriginalY(touchY - rect.top)
      );
    }
  });

  fetch(
    `https://ai.divinci.shop/txt2img?prompt=${data.get(
      "prompt"
    )}&steps=${data.get("steps")}&cfg=${data.get("cfg")}&strength=${data.get(
      "strength"
    )}&negativePrompt=${data.get("negativePrompt")}&model=${data.get("model")}`
  )
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .then((objectURL) => {
      result.src = objectURL;
    })
    .then((foo) => {
      txt2imgResults.appendChild(result);
    });
};

const addTxt2ImgResult = async (id) => {
  const result = document.createElement("img");
  result.classList.add("txt2img__result");

  result.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("Text", event.target.src);
  });

  result.addEventListener("touchend", (event) => {
    const rect = canvasContainer.getBoundingClientRect();
    const touchX = event.changedTouches[0].clientX;
    const touchY = event.changedTouches[0].clientY;
    if (
      touchX > rect.left &&
      touchY > rect.top &&
      touchX < rect.right &&
      touchY < rect.bottom
    ) {
      addImage(
        result,
        getOriginalX(touchX - rect.left),
        getOriginalY(touchY - rect.top)
      );
    }
  });

  fetch(`https://divinci.shop/api/image?imageId=${id}`)
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .then((objectURL) => {
      result.src = objectURL;
    })
    .then((foo) => {
      txt2imgResults.appendChild(result);
    });
};

const transformImage = (event) => {
  const data = new FormData(event.target);
  const layer = getLayerById(event.target.getAttribute("layerID"));
  let c;
  if (layer instanceof Board) {
    c = document.createElement("canvas");
    c.width = layer.width;
    c.height = layer.height;
    const ctxt = c.getContext("2d");
    layer.layerMap.forEach((l) => {
      ctxt.drawImage(l.canvas, l.posX - layer.posX, l.posY - layer.posY);
    });
  } else {
    c = layer.canvas;
  }

  if (c.width > 512) {
    const temp = document.createElement("canvas");
    temp.width = 512;
    temp.height = 512;
    const tempContext = temp.getContext("2d");
    tempContext.drawImage(c, 0, 0, 512, 512);
    c = temp;
  }

  c.toBlob((blob) => {
    fetch(
      `https://ai.divinci.shop/img2img?model=${data.get(
        "model"
      )}&prompt=${data.get("prompt")}&steps=${data.get("steps")}&cfg=${data.get(
        "cfg"
      )}&strength=${data.get("strength")}&negativePrompt=${data.get(
        "negativePrompt"
      )}`,
      {
        method: "PUT",
        body: blob,
      }
    )
      .then((response) => response.blob())
      .then((blob) => URL.createObjectURL(blob))
      .then((objectURL) => {
        const result = new Image();
        result.src = objectURL;
        return result;
      })
      .then((result) => {
        result.onload = () => {
          result.width = 512;
          result.height = 512;
          addImage(result, layer.posX, layer.posY);
        };
      });
  });

  // fetch(`https://ai.divinci.shop/txt2img?prompt=${data.get("prompt")}&steps=${data.get('steps')}&negativePrompt=${data.get('negativePrompt')}`)
  //   .then((response) => response.blob())
  //   .then((blob) => URL.createObjectURL(blob))
  //   .then((objectURL) => {
  //     result.src = objectURL;
  //   })
  //   .then((foo) => {
  //     txt2imgResults.appendChild(result);
  //   });
};
const drawBoard = (board) => {
  context.fillStyle = "#FFFFFF";
  context.fillRect(
    getTransformedX(board.posX),
    getTransformedY(board.posY),
    board.getScaledWidth() * scale,
    board.getScaledHeight() * scale
  );
  board.layerMap.forEach((layer) => {
    if (layer instanceof Board) drawBoard(layer);
    else if (layer instanceof ImageLayer) drawImage(layer);
    else if (layer instanceof DrawableLayer) draw(layer);
  });
};
const outlineSelectedLayers = () => {
  let layers = getSelectedLayersAndBoards();

  layers.forEach((layer) => {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "rgb(93.0, 186.0, 253.0)";
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
  context.strokeStyle = "rgb(93.0, 186.0, 253.0)";
  context.fillRect(
    posX - CORNER_WIDTH / 2,
    posY - CORNER_WIDTH / 2,
    CORNER_WIDTH,
    CORNER_WIDTH
  );
  context.strokeRect(
    posX - CORNER_WIDTH / 2,
    posY - CORNER_WIDTH / 2,
    CORNER_WIDTH,
    CORNER_WIDTH
  );
};
const drawImage = (layer) => {
  context.globalCompositeOperation = "source-over";
  const layerOperations = getLayerOperations(layer);
  if (layerOperations.length > 0)
    layer = getOperatedCopy(layer, layerOperations);
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

const getSelectedBoards = () => {
  const selectedBoards = [];
  document.querySelectorAll(".selected__board").forEach((board) => {
    result = getLayerById(board.id);
    selectedBoards.push(result);
  });
  return selectedBoards;
};

const getBoard = (posX, posY, width, height) => {
  for (let [title, board] of layerMap) {
    if (board instanceof Board)
      if (isPointWithinLayer(posX, posY, board)) return board;
  }

  return null;
};

const isPointWithinLayer = (posX, posY, layer) => {
  if (
    posX > layer.posX &&
    posX < layer.posX + layer.getScaledWidth() &&
    posY > layer.posY &&
    posY < layer.posY + layer.getScaledHeight()
  )
    return true;
  else return false;
};
const addImage = (image, posX, posY) => {
  if (image.naturalWidth && image.naturalHeight) {
    image.imgWidth = image.naturalWidth;
    image.imgHeight = image.naturalHeight;
  } else {
    image.imgWidth = image.width;
    image.imgHeight = image.height;
  }

  const board = getBoard(posX, posY, image.width, image.height);
  let map;
  const layer = { image: image, posX: posX, posY: posY };

  const imageLayer = new ImageLayer(layer);
  if (board === null) {
    map = layerMap;
  } else {
    map = board.layerMap;
    imageLayer.board = board;
  }

  map.set(imageLayer.id, imageLayer);
  selectedLayer = imageLayer.id;
  drawCanvas();
  refreshLayers();
  outlineSelectedLayers();
};

const deselectAllLayers = () => {
  document
    .querySelectorAll(".selected__layer")
    .forEach((layer) => layer.classList.remove("selected__layer"));
  document
    .querySelectorAll(".selected__board")
    .forEach((layer) => layer.classList.remove("selected__board"));
};

const getLayerById = (id) => {
  for (let [title, layer] of layerMap) {
    if (layer.id === id) return layer;
    else if (layer instanceof Board) {
      let result = layer.layerMap.get(id);
      if (result) return result;
    }
  }
  return null;
};
const deleteLayer = (id) => {
  if (layerMap.get(id)) layerMap.delete(id);
  layerMap.forEach((layer) => {
    if (layer instanceof Board)
      if (layer.layerMap.get(id)) layer.layerMap.delete(id);
  });
  refreshLayers();
  drawCanvas();
};

const getSelectedLayers = () => {
  const selectedLayers = [];
  document.querySelectorAll(".selected__layer").forEach((layer) => {
    result = getLayerById(layer.id);
    selectedLayers.push(result);
  });
  return selectedLayers;
};

const getSelectedLayersAndBoards = () => {
  let selectedLayers = getSelectedLayers();
  selectedLayers = [...selectedLayers, ...getSelectedBoards()];
  return selectedLayers;
};

const lassoCropEventHandler = (event) => {
  const originalX = getOriginalX(event.offsetX);
  const originalY = getOriginalY(event.offsetY);
  if (
    points.length > 0 &&
    Math.abs(originalX - points[0].x) < 5 &&
    Math.abs(originalY - points[0].y) < 5
  ) {
    lassoDraw(true);
  } else {
    points.push({ x: originalX, y: originalY });
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
    context.lineTo(getTransformedX(point.x), getTransformedY(point.y));
  });
  if (dash === true) {
    context.closePath();
    lassoCrop();
  } else context.stroke();
};

const lassoCrop = () => {
  let selectedLayers = getSelectedLayers();
  selectedLayers.forEach((layer) => {
    let relativePoints = [];
    points.forEach((point) => {
      relativePoints.push({ x: point.x - layer.posX, y: point.y - layer.posY });
    });
    const operation = new CropOperation(
      layer.id,
      [...relativePoints],
      layer.scale
    );
    operations.push(operation);
  });
  drawCanvas();
  points.splice(0, points.length);
};

const applyCrop = (operation, layer) => {
  let cropContext = layer.context;
  let operationPoints = operation.points;
  cropContext.globalCompositeOperation = "destination-out";
  cropContext.beginPath();
  operationPoints.forEach((point) => {
    cropContext.lineTo(point.x / operation.scale, point.y / operation.scale);
  });
  cropContext.closePath();
  cropContext.fill();
};

const moveEventHandler = (event) => {
  dragging = true;
  let layers = getSelectedLayersAndBoards();

  layers.forEach((layer) => {
    layer.click_posx = getOriginalX(event.offsetX) - layer.posX;
    layer.click_posy = getOriginalY(event.offsetY) - layer.posY;
  });
  drawCanvas();
};

const evaluateBoard = (layer) => {
  const oldBoard = layer.board;
  for (const [title, board] of layerMap) {
    if (board instanceof Board) {
      if (isPointWithinLayer(layer.posX, layer.posY, board)) {
        if (oldBoard !== board) {
          if (oldBoard) oldBoard.layerMap.delete(layer.id);
          else {
            layerMap.delete(layer.id);
          }
          board.layerMap.set(layer.id, layer);
          board.isCollapsed = false;
          layer.board = board;
          refreshLayers();
          return;
        }
        return;
      }
    }
  }

  if (oldBoard) {
    layerMap.set(layer.id, layer);
    oldBoard.layerMap.delete(layer.id);
    layer.board = undefined;
    refreshLayers();
  }
};

const drawBoardStartEventHandler = (event) => {
  drawing = true;
  const board = new Board({
    posX: getOriginalX(event.offsetX),
    posY: getOriginalY(event.offsetY),
    width: 0,
    height: 0,
  });
  selectedLayer = board.id;
  layerMap.set(board.id, board);

  refreshLayers(true);
};

const drawBoardEventHandler = (event) => {
  const board = getSelectedBoards()[0];
  const width = getOriginalX(event.offsetX) - board.posX;
  const height = getOriginalY(event.offsetY) - board.posY;
  board.width = width;
  board.height = height;
  drawCanvas();
};
const resizeEventHandler = (event) => {
  const x = getOriginalX(event.offsetX);
  const y = getOriginalY(event.offsetY);
  let layers = getSelectedLayersAndBoards();

  layers.forEach((layer) => {
    const dx = x - (layer.posX + layer.width);
    const dy = layer.posY + layer.getScaledHeight() - y;
    layer.scale = (layer.width + dx) / layer.width;
  });
  drawCanvas();
};

const hideSidebarWindows = () => {
  sidebarSelectionItems.forEach((item) => {
    item.style.backgroundColor = "rgb(24, 25, 27)";
    item.style.borderTopLeftRadius = "0px";
    item.style.borderBottomLeftRadius = "0px";
    item.classList.remove("active__window");
  });
  document
    .querySelectorAll(".sidebar__window")
    .forEach((window) => window.classList.remove("active__sidebar__window"));
};
const startResize = (event) => {
  resizing = true;
};

const setStartPoints = (event) => {
  start = { x: event.offsetX, y: event.offsetY };
};

const setTranslate = (dx, dy) => {
  translateX += dx / scale;
  translateY += dy / scale;
  drawCanvas();
};

const downloadCanvas = (design) => {
  let anchor = document.createElement("a");
  anchor.href = design.canvas.toDataURL("image/png");
  anchor.download = `${design.layerTitle}.png`;
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

const saveImage = (imageLayer) => {
  imageLayer.imageId = imageLayer.imageId
    ? imageLayer.imageId
    : crypto.randomUUID();
  let api = "https://divinci.shop/api/image";

  imageLayer.canvas.toBlob((blob) => {
    fetch(api, {
      headers: {
        imageId: imageLayer.imageId,
      },
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

canvas.addEventListener("pointermove", (event) => {
  if (pointerCache.length == 2) {
    return;
  } else if (resizing) resizeEventHandler(event);
  else if (isPointerOverCorner(event)) canvas.style.cursor = "grab";
  else if (mode === "board" && drawing) drawBoardEventHandler(event);
  else if (spaceDown) canvas.style.cursor = "grab";
  else canvas.style.cursor = "url(assets/cursor.png),pointer";
});
//TODO: change pointer icon
const isPointerOverCorner = (event) => {
  let layers = getSelectedLayersAndBoards();

  for (const layer of layers) {
    if (
      Math.abs(event.offsetX - getTransformedX(layer.posX)) < CORNER_WIDTH &&
      Math.abs(event.offsetY - getTransformedY(layer.posY)) < CORNER_WIDTH
    ) {
      return true;
    } else if (
      Math.abs(
        event.offsetX - getTransformedX(layer.posX + layer.getScaledWidth())
      ) < CORNER_WIDTH &&
      Math.abs(event.offsetY - getTransformedY(layer.posY)) < CORNER_WIDTH
    ) {
      return true;
    } else if (
      Math.abs(event.offsetX - getTransformedX(layer.posX)) < CORNER_WIDTH &&
      Math.abs(
        event.offsetY - getTransformedY(layer.posY + layer.getScaledHeight())
      ) < CORNER_WIDTH
    ) {
      return true;
    } else if (
      Math.abs(
        event.offsetX - getTransformedX(layer.posX + layer.getScaledWidth())
      ) < CORNER_WIDTH &&
      Math.abs(
        event.offsetY - getTransformedY(layer.posY + layer.getScaledHeight())
      ) < CORNER_WIDTH
    ) {
      return true;
    } else return false;
  }
};
canvas.addEventListener("drop", (event) => {
  const image = new Image();
  image.src = event.dataTransfer.getData("Text");
  addImage(image, getOriginalX(event.offsetX), getOriginalY(event.offsetY));
});

canvas.addEventListener("dragover", (event) => {
  event.preventDefault();
  return false;
});
canvasContainer.addEventListener("pointerdown", (event) => {
  if (spaceDown || mode === "pan") {
    setStartPoints(event);
    panning = true;
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (pointerCache.length == 2) return;
  else if (spaceDown) return;
  else if (isPointerOverCorner(event, true)) startResize(event);
  else if (mode == "crop") lassoCropEventHandler(event);
  else if (mode == "move") moveEventHandler(event);
  else if (mode === "board") drawBoardStartEventHandler(event);
});

canvasContainer.addEventListener("pointermove", (event) => {
  if (pointerCache.length == 2) return;
  else if (panning) {
    dx = event.offsetX - start.x;
    dy = event.offsetY - start.y;
    start.x = event.offsetX;
    start.y = event.offsetY;
    setTranslate(dx, dy);
  } else if (mode === "move" && dragging) {
    let layers = getSelectedLayersAndBoards();

    layers.forEach((layer) => {
      layer.posX = getOriginalX(event.offsetX) - layer.click_posx;
      layer.posY = getOriginalY(event.offsetY) - layer.click_posy;
      evaluateBoard(layer);
    });

    drawCanvas();
  } else if (drawing) {
  }
});

const ACTIVE_CLASS = "active";
const clearCrop = () => {
  points.splice(0, points.length);
  drawCanvas();
};
const setMode = (event) => {
  if (mode === "crop") clearCrop();
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

sidebar.addEventListener("wheel", (event) => {
  event.stopPropagation();
});
const getOriginal = (x, y) => {
  const original = { x: x / scale - translateX, y: y / scale - translateY };
  return original;
};

const getOriginalX = (x) => {
  return x / scale - translateX;
};

const getOriginalY = (y) => {
  return y / scale - translateY;
};

const getTransformedX = (x) => {
  return (x + translateX) * scale;
};

const getTransformedY = (y) => {
  return (y + translateY) * scale;
};

document.addEventListener("pointerup", (event) => {
  if (panning) panning = false;
  else if (dragging) dragging = false;
  else if (resizing) {
    resizing = false;
  } else if (drawing) {
    drawing = false;
  }
});

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey) {
    if (event.key == "z" || event.key == "Z") {
      undo();
    }
  } else if (event.key == " ") {
    event.preventDefault();
    spaceDown = true;
    canvas.style.cursor = "grab";
  }
});

txt2imgForm.addEventListener("keydown", (event) => {
  event.stopPropagation();
});

document.addEventListener("keyup", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    canvas.style.cursor = "auto";
    spaceDown = false;
  }
});

const saveLayer = (layerID) => {
  let design = layerMap.get(layerID);
  // const tempCanvas = document.createElement("canvas");
  // const tempContext = tempCanvas.getContext("2d");
  // tempCanvas.width = design.width;
  // tempCanvas.height = design.height;
  // tempContext.putImageData(
  //   context.getImageData(design.posX, design.posY, design.width, design.height),
  //   0,
  //   0
  // );
  // // saveDrawing(tempCanvas);
  downloadCanvas(design);
};

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

  result.addEventListener("touchend", (event) => {
    const rect = canvasContainer.getBoundingClientRect();
    const touchX = event.changedTouches[0].clientX;
    const touchY = event.changedTouches[0].clientY;
    if (
      touchX > rect.left &&
      touchY > rect.top &&
      touchX < rect.right &&
      touchY < rect.bottom
    ) {
      addImage(
        result,
        getOriginalX(touchX - rect.left),
        getOriginalY(touchY - rect.top)
      );
    }
  });

  fetch(`https://ai.divinci.shop/txt2img?prompt=${data.get("prompt")}&steps=30`)
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

toolbarCollapseButton.addEventListener("click", (event) => {
  toolbarCollapseButton.style.display = "none";
  sidebar.style.display = "flex";
});

sidebarSelectionItems.forEach((item) =>
  item.addEventListener("click", (event) => {
    if (event.target.classList.contains("active__window")) {
      toolbarCollapseButton.style.display = "block";
      sidebar.style.display = "none";
    } else {
      hideSidebarWindows();
      for (let i = 0; i < sidebarSelectionItems.length; i++) {
        if (
          sidebarSelectionItems[i].getAttribute("forWindow") ===
          event.target.getAttribute("forWindow")
        ) {
          if (i - 1 >= 0)
            sidebarSelectionItems[i - 1].style.borderBottomLeftRadius = "10px";
          if (i + 1 < sidebarSelectionItems.length)
            sidebarSelectionItems[i + 1].style.borderTopLeftRadius = "10px";
        }
      }

      event.target.classList.add("active__window");
      event.target.style.backgroundColor = "rgb(37, 38, 39)";
      document
        .getElementById("sidebar_" + event.target.getAttribute("forWindow"))
        .classList.add("active__sidebar__window");
    }
  })
);
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

const pointerDownHandler = (event) => {
  pointerCache.push(event);
};
let prevDist = 0;
let curDist = 0;
const pointerMoveHandler = (event) => {
  const index = pointerCache.findIndex(
    (pointer) => pointer.pointerId === event.pointerId
  );
  pointerCache[index] = event;

  if (pointerCache.length == 2) {
    const midPointX = (pointerCache[0].offsetX + pointerCache[1].offsetX) / 2;
    const midPointY = (pointerCache[0].offsetY + pointerCache[1].offsetY) / 2;
    curDist =
      ((pointerCache[1].offsetX - pointerCache[0].offsetX) ** 2 +
        (pointerCache[1].offsetY - pointerCache[0].offsetY) ** 2) **
      0.5;
    // const original = getOriginal(pointerCache[0].offsetX, pointerCache[0].offsetY);
    const original = getOriginal(midPointX, midPointY);

    if (curDist > prevDist) {
      scale *= 1.02;
    } else {
      scale /= 1.02;
    }
    // if(prevDist=0) prevDist=curDist;

    // scale *= Math.abs(curDist - prevDist)/curDist;
    translateX =
      (pointerCache[0].offsetX + pointerCache[1].offsetX) / 2 / scale -
      original.x;
    translateY =
      (pointerCache[0].offsetY + pointerCache[1].offsetY) / 2 / scale -
      original.y;
    prevDist = curDist;
    drawCanvas();
  }
};

const pointerUpHandler = (event) => {
  const index = pointerCache.findIndex(
    (pointer) => pointer.pointerId === event.pointerId
  );
  pointerCache.splice(index, 1);
};
editorContainer.addEventListener("touchstart", (event) => {
  if (event.touches.length > 1) {
    // const x =  event.touches[0].clientX - canvasContainer.getBoundingClientRect().left;
    // const y = event.touches[0].clientY - canvasContainer.getBoundingClientRect().top;
    event.preventDefault();
  }
});

const readImage = async (file) => {
  var reader = new FileReader();
  const output = new Image();
  reader.onload = function () {
    console.log("loaded");
    var dataURL = reader.result;
    output.src = dataURL;
  };
  reader.readAsDataURL(file);
  output.addEventListener("load", () => {
    output.width = 512;
    output.height = 512;
    addImage(output, translateX, translateY);
  });
};

document.getElementById("input_file").addEventListener("change", (event) => {
  var files = event.target.files;
  for (let file = 0; file < files.length; file++) {
    readImage(files[file]);
  }
});

const getLayerObject = (layer) => {
  if (layer instanceof ImageLayer) {
    saveImage(layer);
  }
  const layerObject = {
    posX: layer.posX,
    posY: layer.posY,
    layerTitle: layer.layerTitle,
    height: layer.height,
    width: layer.width,
    scale: layer.scale,
    id: layer.id,
    type: layer.type,
    imageId: layer.imageId,
  };

  if (layer instanceof Board) {
    layerObject.isCollapsed = layer.isCollapsed;
    layerObject.layerMap = [];
    layer.layerMap.forEach((l, id) => {
      layerObject.layerMap.push(getLayerObject(l));
    });
  }
  return layerObject;
};

const saveProject = () => {
  const canvas = {};
  canvas.layerMap = [];
  layerMap.forEach((layer, id) => {
    canvas.layerMap.push(getLayerObject(layer));
  });

  fetch("https://divinci.shop/api/project", {
    headers: {
      projectId: projectId,
    },
    method: "PUT",
    body: JSON.stringify({
      title: "board 1",
      canvas: canvas,
      instagramHandle: instagramHandle,
      subjectType: subjectType,
    }),
  });
};

const loadProject = (projectId) => {
  // fetch(`https://divinci.shop/api/project?projectId=${projectId}`)
  //   .then((response) => response.json())
  //   .then((project) => {
  //     const canvas = project.canvas;
  //     instagramHandle = project.instagramHandle;
  //     subjectType = project.subjectType;
  //     for (let layer of canvas.layerMap) {
  //       if (layer.type === "image") {
  //         const imageLayer = loadImage(layer, layerMap);
  //       } else if (layer.type === "board") {
  //         const boardLayer = loadBoard(layer);
  //         layerMap.set(layer.id, boardLayer);
  //       }
  //     }
  //     loadGenerations();
  //     refreshLayers();
  //     drawCanvas();
  //   });
  loadGenerations();
  refreshLayers();
};

const loadGenerations = () => {
  fetch(`https://divinci.shop/api/image?order=${projectId}`)
    .then((response) => {
      return response.json();
    })
    .then((images) => {
      for (let document of images.documents) {
        addTxt2ImgResult(document.id);
      }
    });
};

const loadBoard = (boardLayer) => {
  const board = new Board(boardLayer);
  for (let layer of boardLayer.layerMap) {
    if (layer.type === "image") {
      loadImage(layer, board.layerMap);
    } else if (layer.type === "board") {
      const newBoard = loadBoard(layer);
      board.layerMap.set(layer.id, newBoard);
    }
  }
  return board;
};

const loadImage = (layer, layerMap) => {
  fetch(`https://divinci.shop/api/image?imageId=${layer.imageId}`)
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .then((objectURL) => {
      const img = new Image();
      img.src = objectURL;
      img.onload = () => {
        img.imgWidth = img.naturalWidth;
        img.imgHeight = img.naturalHeight;
        layer.image = img;
        const imageLayer = new ImageLayer(layer);
        layerMap.set(layer.id, imageLayer);
        refreshLayers();
        drawCanvas();
      };
    });
};

canvasContainer.addEventListener("pointerdown", pointerDownHandler);
canvasContainer.addEventListener("pointermove", pointerMoveHandler);
canvasContainer.addEventListener("pointerup", pointerUpHandler);
canvasContainer.addEventListener("pointercancel", pointerUpHandler);
canvasContainer.addEventListener("pointerout  ", pointerUpHandler);
canvasContainer.addEventListener("pointerleave", pointerUpHandler);
save.addEventListener("click", saveProject);
