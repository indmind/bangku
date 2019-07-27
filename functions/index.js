const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true })

const firebaseConfig = {
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://bagi-kursi.firebaseio.com"
};

admin.initializeApp(firebaseConfig);

const ref = admin.firestore().collection("kursi");

const randomizeEachDay = 7;

exports.getCurrent = functions.https.onRequest((request, response) => {
    cors(request, response, async () => {
        const currentDate = new Date();

        let result = await getLastData();

        result.data = JSON.parse(result.data);

        let nextGenerateDate = result.timestamp.toDate()
        nextGenerateDate.setDate(result.timestamp.toDate().getDate() + randomizeEachDay);

        if (currentDate >= convertUTCDateToLocalDate(nextGenerateDate)) {
            const newData = await bagiBedaDengan(result.data);

            try {
                await ref.doc(formatDate(currentDate)).set({
                    data: JSON.stringify(newData),
                    timestamp: result.timestamp
                })

                result = await getLastData();

                result.data = JSON.parse(result.data)

                let nextGenerateDate = result.timestamp.toDate()
                nextGenerateDate.setDate(result.timestamp.toDate().getDate() + randomizeEachDay);
            } catch (err) {
                response.end(err.message)
            }
        }

        result.nextGenerated = nextGenerateDate;

        response.json(result);
    })

    
});

async function getLastData() {
    const snapshot = await ref.orderBy("timestamp").limit(1).get();
        
    return snapshot.docs[0].data();
}

async function bagiBedaDengan(data) {
    const snapshot = await admin.firestore().collection("absen").doc("default").get();
    const murid = snapshot.data().data;

    let count = 0;
    const maxCount = 100;

    let hasil;

    do {
        // eslint-disable-next-line no-await-in-loop
        hasil = await bagiRata(murid, 18);
    } while (cekKesamaan(hasil, data) && count++ < maxCount);

    console.log(`Complete randomizing with ${count} tries`)

    return hasil;
}

function convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  
    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();
  
    newDate.setHours(hours - offset);
  
    return newDate;
  }

function formatDate(date) {
    return date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear()
}

async function bagiRata(murid, jumlah) {
    const randomizeChunk = c => {
        for (let i = 0; i < random(1, 3); i++) {
            c = shuffle(c)
        }

        return c
    }

    let laki, perempuan, chunkOverMemory;

    let candiDate = [34, 8];

    if (jumlah === 18) {
        laki = randomizeChunk(murid.filter(m => m.kelamin === 'l' && ![33, 23].includes(m.no)));
        perempuan = randomizeChunk(murid.filter(m => m.kelamin === 'p' && !candiDate.includes(m.no)));

        jumlah -= candiDate.length;
        chunkOverMemory = true;
    } else {
        laki = randomizeChunk(murid.filter(m => m.kelamin === 'l'));
        perempuan = randomizeChunk(murid.filter(m => m.kelamin === 'p'));
    }

    const portion = random(2, Math.floor(perempuan.length * 0.8))

    const lakiChunks = randomizeChunk(chunk(laki, portion).map(randomizeChunk))
    const perempuanChunks = randomizeChunk(chunk(perempuan, portion).map(randomizeChunk))

    const lakiRes = shuffle(lakiChunks.reduce((acc, cur) => [...acc, ...cur]))
    const perempuanRes = perempuanChunks.reduce((acc, cur) => [...acc, ...cur])

    const kelompok = [];

    // entah kenapa gk bisa gini -> Array(jumlah).fill().map(() => [])
    for (let i = 0; i < jumlah; i++) {
        kelompok.push([]);
    }

    let i = 0;

    while (lakiRes.length || perempuanRes.length) {
        if (lakiRes.length) kelompok[i].push(lakiRes.pop());
        else kelompok[i].push(perempuanRes.pop());

        i++;
        if (i >= jumlah) i = 0;
    }

    const result = shuffle(kelompok);

    if (chunkOverMemory) {
        result.splice(3, 0, [murid.find(m => m.no === 23), murid.find(m => m.no === candiDate[0])]);
        result.splice(4, 0, [murid.find(m => m.no === 33), murid.find(m => m.no === candiDate[1])]);
    }

    return result;
}

function cekKesamaan(a, b) {
    if (!a.length || !b.length) return false;

    for (let da of a.length > b.length ? a : b) {
        for (let db of a.length > b.length ? b : a) {
            // urutkan -> bandingkan
            const sortedA = da.map(n => n.nama).sort();
            const sortedB = db.map(n => n.nama).sort();

            if (JSON.stringify(sortedA) === JSON.stringify(sortedB)) return true;
        }
    }

    return false;
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

    return a;
}

function chunk(array, size) {
    const chunked_arr = [];
    let copied = [...array];
    const numOfChild = Math.ceil(copied.length / size);
    for (let i = 0; i < numOfChild; i++) {
        chunked_arr.push(copied.splice(0, size));
    }
    return chunked_arr;
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
