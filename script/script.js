const btCopy = document.getElementById("btCopy")
const container = document.getElementById('container');
const snackbar = document.getElementById("snackbar");
const todayDate = document.getElementById("today-date");
const generatedDate = document.getElementById("generated-date");
const nextGeneratedDate = document.getElementById("next-generated-date");
const loadingDiv = document.getElementById("splash-screen");

let urutanBangku = [];

(async function () {
  const response = await fetch("https://us-central1-bagi-kursi.cloudfunctions.net/getCurrent");
  const result = await response.json();

  urutanBangku = result.data;

  loadingDiv.style.opacity = 0;

  setTimeout(() => {
    loadingDiv.remove()
  }, 500)

  generatedDate.innerHTML = `Generated at: ${parseDate(result.timestamp._seconds * 1000)}`;
  nextGeneratedDate.innerHTML = `Next Generate: ${parseDate(result.nextGenerated)}`;

  btCopy.addEventListener("click", copyHasil)

  render(urutanBangku);
}())

function parseDate(timestamp) {
  return convertUTCDateToLocalDate(new Date(timestamp)).toUTCString()
}

function convertUTCDateToLocalDate(date) {
  var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

  var offset = date.getTimezoneOffset() / 60;
  var hours = date.getHours();

  newDate.setHours(hours - offset);

  return newDate;
}

function render(data) {
  container.innerHTML = '';

  let index = 1;

  for (let d of data) {
    const divKelompok = document.createElement('div');
    const card = document.createElement('div');
    const ul = document.createElement('ul');
    const kel = document.createElement('span');

    divKelompok.className = 'col-sm-6 col-md-3 colom';
    card.className = 'card';
    kel.className = 'kel';

    kel.appendChild(document.createTextNode(index++));

    for (let murid of d) {
      let li = document.createElement('li');
      let textNode = document.createTextNode(`${murid.nama} / ${murid.no}`);

      li.appendChild(textNode);
      ul.appendChild(li);
    }

    divKelompok.appendChild(kel);
    divKelompok.appendChild(card);

    card.appendChild(ul);

    container.appendChild(divKelompok);
  }
}

function copyToClipboard(str) {
  const el = document.createElement('textarea');

  el.setAttribute('readonly', '');

  el.value = str;
  el.style.position = 'absolute';
  el.style.left = '-9999px';

  document.body.appendChild(el);

  const selected =
    document.getSelection().rangeCount > 0
      ? document.getSelection().getRangeAt(0)
      : false;

  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);

  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
}

function copyHasil() {
  if (!urutanBangku.length) return

  let hasil = '';
  let index = 1;

  for (let kelompok of urutanBangku) {
    hasil += `*Meja ${index++}:*\n`;

    for (let murid of kelompok) {
      hasil += `- ${murid.nama} (${murid.no})\n`;
    }

    hasil += '\n';
  }

  copyToClipboard(hasil);

  snackbar.className = "show";

  setTimeout(
    () => snackbar.className = snackbar.className.replace("show", ""),
    3000);
}
