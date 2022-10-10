const canvas = document.getElementById("editor");
const context = canvas.getContext("2d");
const save = document.getElementById("save");
const editButton = document.getElementById("edit_button");
const promptImg = document.getElementById("image");
const layers = document.getElementById("layers");

canvas.width = 864;
canvas.height = 864;

const imageMap = new Map();
const drawCanvas = () => {
  //   const images = getSelectedImages();
  const images = imageMap;
  context.clearRect(0, 0, canvas.width, canvas.height);
  images.forEach((image) =>
    context.putImageData(image.imgData, image.pos_x, image.pos_y)
  );
};
const mockMap = new Map();
const addImage = () => {
  const image = new Image();
  image.src = promptImg.src;
  image.pos_x = Math.random() * 100;
  image.pos_y = Math.random() * 100;
  image.mat = cv.imread(image);
  image.imgData = convertToImageData(image.mat);
  image.imgData.height = 512;
  image.imgData.width = 512;
  const random_addition = String(Math.random());
  imageMap.set(image.src + random_addition, image);
  mockMap.set("1", image);
  const layer = document.createElement("div");
  const layer_img = document.createElement("img");
  layer_img.src = image.src;
  layer_img.height = 64;
  layer_img.width = 64;
  layer.appendChild(layer_img);
  layer.className = "not_selected";
  layer.key = image.src + random_addition;
  layer.addEventListener("click", () => {
    if (layer.className == "not_selected") layer.className = "selected";
    else if (layer.className == "selected") layer.className = "not_selected";
  });
  layers.appendChild(layer);

  drawCanvas();
};
const saveDrawing = () => {
  canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
  var anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = "IMAGE.PNG";
  anchor.click();
};

canvas.addEventListener("mousedown", function (event) {
  const images = getSelectedImages();
  images.forEach((image) => {
    image.click_posx = event.offsetX - image.pos_x;
    image.click_posy = event.offsetY - image.pos_y;
  });
});

canvas.addEventListener("mouseup", function (event) {
  const images = getSelectedImages();
  images.forEach((image) => {
    image.pos_x = event.offsetX - image.click_posx;
    image.pos_y = event.offsetY - image.click_posy;
  });
  drawCanvas();
  image.draggable = false;
});

const draw = (x, y) => {
  context.font = "50px Comic Sans MS";
  context.fillText("Hello world", x, y);
};

const convertToImageData = (mat) => {
  if (!(mat instanceof cv.Mat)) {
    throw new Error("Please input the valid cv.Mat instance.");
    return;
  }
  var img = new cv.Mat();
  var depth = mat.type() % 8;
  var scale = depth <= cv.CV_8S ? 1 : depth <= cv.CV_32S ? 1 / 256 : 255;
  var shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128 : 0;
  mat.convertTo(img, cv.CV_8U, scale, shift);
  switch (img.type()) {
    case cv.CV_8UC1:
      cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA);
      break;
    case cv.CV_8UC3:
      cv.cvtColor(img, img, cv.COLOR_RGB2RGBA);
      break;
    case cv.CV_8UC4:
      break;
    default:
      throw new Error(
        "Bad number of channels (Source image must have 1, 3 or 4 channels)"
      );
      return;
  }
  var imgData = new ImageData(
    new Uint8ClampedArray(img.data),
    img.cols,
    img.rows
  );
  img.delete();
  return imgData;
};

const enlargeImage = (src) => {
  console.log(src);
  console.log(src.rows);
  console.log(src.cols);
  let dst = new cv.Mat();
  cv.resize(
    src,
    dst,
    new cv.Size(0, 0),
    2,
    2,
    (interpolation = cv.INTER_LINEAR)
  );
  //delete matrices
  // return dst;
  let pic = convertToImageData(dst);

  // context.putImageData(pic, 0, 0);
  cv.imshow(canvas, dst);
};

const shrinkImage = (src) => {
  let dst = new cv.Mat();
  cv.resize(src, dst, new cv.Size(0, 0), 0.1, 0.1, cv.INTER_AREA);
  //delete matrices
  cv.imshow(canvas, dst);
};
const getSelectedImages = () => {
  const selectedImages = [];

  [...layers.children].forEach((layer) => {
    if (layer.className == "selected")
      selectedImages.push(imageMap.get(layer.key));
  });
  console.log(selectedImages);
  return selectedImages;
};

save.addEventListener("click", () => {
  const reference = crypto.randomUUID(); 
  const design = canvas.toDataURL(); 
  const requestOptions = {
    method: "Post",
    body:JSON.stringify({reference:reference,design:design})
    
    };
  fetch("http://127.0.0.1:8080/design/add",requestOptions);
  window.location.href="http://localhost:3000/?ref="+reference; 
  
});

// save.addEventListener("click", () => {
//   const image = mockMap.get('1');
//   console.log(image.imgData.width);
//   console.log(image.imgData.height)
//   enlargeImage(image.mat);
// });

editButton.addEventListener("click", addImage);
