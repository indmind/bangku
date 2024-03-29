const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true })

const firebaseConfig = {
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://bagi-kursi.firebaseio.com"
};

const isDebug = false;

admin.initializeApp(firebaseConfig);

const ref = admin.firestore().collection(isDebug ? "kursi-devt" : "kursi");

const dayDelay = 7;

exports.getCurrent = functions.https.onRequest((request, response) => {
    cors(request, response, async () => {
        const currentDate = new Date();

        const currentTime = currentDate.getTime();
        const updateTime = currentDate.setDate(currentDate.getDate() + dayDelay);

        // reset current date
        currentDate.setDate(currentDate.getDate() - dayDelay);

        let result = await getLastData();

        if (isDebug || result === null) {
            const newData = await bagiBedaDengan([]);

            await ref.doc(formatDate(currentDate)).set({
                data: JSON.stringify(newData),
                timestamp: currentTime, // generated time
                scheduledGenerateTime: currentTime, // generated time based on last data
                nextUpdateScheduleTime: updateTime// update time
            })

            result = await getLastData();
        }

        let nextUpdateSchedule = result.nextUpdateScheduleTime;

        if (currentTime >= nextUpdateSchedule && !isDebug) {
            const newData = await bagiBedaDengan(JSON.parse(result.data));

            try {
                console.log("Inserting new data: " + formatDate(currentDate))

                const nextUpdateDate = new Date(nextUpdateSchedule);

                nextUpdateDate.setDate(nextUpdateDate.getDate() + dayDelay);

                await ref.doc(formatDate(currentDate)).set({
                    data: JSON.stringify(newData),
                    timestamp: currentTime, // generated time
                    scheduledGenerateTime: nextUpdateSchedule, // generated time based on last data
                    nextUpdateScheduleTime: nextUpdateDate.getTime()// update time
                })

                result = await getLastData();

            } catch (err) {
                response.end(err.message)
            }
        }

        result.data = JSON.parse(result.data)

        response.json(result);
    })
});

async function getLastData() {
    const snapshot = await ref.orderBy("timestamp", "desc").limit(1).get();

    if (snapshot.docs.length) {
        return snapshot.docs[0].data();
    }

    return null;
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

function formatDate(date) {
    return date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear()
}

async function bagiRata(murid, jumlah) {
    const segmentationFix = true;

    const randomizeChunk = c => {
        for (let i = 0; i < random(1, 3); i++) {
            c = shuffle(c)
        }

        return c
    }

    let laki, perempuan, chunkOverMemory;

    const fixedMedian = [];

    let students = murid;

    if (jumlah === 18 && segmentationFix) {
        for(let datesMean of fixedMedian) {
            students = students.filter(m => 
                !(m.no === datesMean[0] || m.no === datesMean[1])
            );

            jumlah--;
        }
        
        laki = randomizeChunk(students.filter(m => m.kelamin === 'l'));
        perempuan = randomizeChunk(students.filter(m => m.kelamin === 'p'));

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
        for(let datesMean of fixedMedian) {
            result.splice(datesMean[2], 0, [
                murid.find(m => m.no === datesMean[0]),
                murid.find(m => m.no === datesMean[1]),
            ])
        }
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
