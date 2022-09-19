const input = document.getElementById('prompt');
const form = document.getElementById('prompt_form');
const imageUrl = "http://localhost:1722/txt2img?ddim_steps=20&n_samples=1&n_iter=1&prompt=";
const img = document.getElementById('image');

const fetchImage = async (event) => {
    event.preventDefault();
    const res = await fetch(imageUrl+input.value, {method:"GET"});
    const imageBlob = await res.blob();
    const imageObjectURL = URL.createObjectURL(imageBlob);
    img.src = imageObjectURL;
}

form.addEventListener('submit', fetchImage);
