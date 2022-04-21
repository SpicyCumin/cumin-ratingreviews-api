"use strict";

const fs = require('fs');
const { pipeline } = require('stream');
const csv = require('csv-parser')
const path = require('path')

const csvDir = process.env.CSV_DIR
console.log('csvDir', csvDir)
const reviewCSV = path.join(csvDir, "/reviews.csv")
const metaCSV = path.join(csvDir, "/metas.csv")
const photoCSV = path.join(csvDir, "/photos.csv")



function makeGenStream(streamFile) {
  const stream = fs.createReadStream(streamFile).pipe(csv())
  .on('error', function(err) {
      console.log('review err ', err.stack);
  })
  .on('end', function(err) {
    console.log(`\n\n ----Stream from ${streamFile} ended----\n\n`);
  })
  .on('close', function(err) {
    console.log(`\n\n ----Stream ${streamFile} closed----\n\n`);
  })
  return stream
}

async function* metaGenStream(streamFile) {

  const stream = makeGenStream(streamFile)
  for await (let chunk of stream) {
    yield chunk
  }
}


async function* reviewGenStream(streamFile) {
  const stream = makeGenStream(streamFile)
  for await (let chunk of stream) {
    yield chunk
  }
}

async function* photoGenStream(streamFile) {
  const stream = makeGenStream(streamFile)
  let photos = []
  let review_id;

  for await (let chunk of stream) {

    review_id = !review_id && chunk.review_id
    if (chunk.review_id === review_id) {
      photos.push(chunk)
    }
    else {
      yield photos
      photos = [chunk]
      review_id = chunk.review_id
    }
  }
}

const loopLog = 5000

async function hydrate() {
  console.log('running hydrate')
  const metaGen = metaGenStream(metaCSV)
  const reviewGen = reviewGenStream(reviewCSV)
  const photoGen = photoGenStream(photoCSV)
  console.log('reviewGen', reviewGen)
  console.log('metaGen', metaGen)
  console.log('photoGen', photoGen)


  let meta = await metaGen.next()
  let reviews = await reviewGen.next()
  let photos = await photoGen.next()
  let mem = process.memoryUsage()
  let loops = 0
  let createdReviews = 0
  let createdPhotos = 0
  let createdMetas = 0

  let newReviews = [];

  while (!reviews.done) {




    if (review.value.id === photos.value[0].review_id) {
      photos.value.forEach(photo => photo.review_id = review.value.id )
      await this.create.many.photos(photos.value)
      createdPhotos += photos.value.length
      photos = !photos.done ?  await photoGen.next() : photos
    }
    if (review.value.id === meta.value.review_id) {
      meta.value.review_id = review.value.id
      review.value.meta_id = meta.value.id
      await this.create.metas(meta.value)
      createdMetas++
      meta = !meta.done ?  await metaGen.next() : meta
    }

    !review.done && newReviews.push(review.value)
    if (newReviews.length === bulkWriteAt || review.done) {
      await this.create.many.reviews(newReviews)
      createdReviews += newReviews.length
      newReviews = []
    }

    review = !review.done ?  await reviewGen.next() : review



    if ( !(loops % loopLog)) {
      console.log(`\n\nloopped ${loops} times`)
      console.log(`createdReviews ${createdReviews}  createdPhotos ${createdPhotos}  createdMetas ${createdMetas}`)
      console.log(`Done? review ${reviews.done} meta ${meta.done} photos ${photos.done}`)
      // mem = process.memoryUsage()
      // console.log(`Mem use \nrss:${mem.rss} \nheapMax: ${mem.heapTotal} heapUsed:${mem.heapUsed}  \narrayBuffers:${mem.arrayBuffers}`)
    }
    loops++
  }
  console.log('\n ---DONE---- ')
  return true
}





async function checkForHydration() {
  console.log('Checking DB for data sequelize ', this)
  // await this.sequelize.authenticate()
  await this.sequelize.sync({ force: true })
  this.hydrate()
}

module.exports = { hydrate, checkForHydration }

//  node --max_old_space_size=400 app.js
//   clinic heapprofiler -- node --max_old_space_size=400 app.js
//  clinic doctor -- node --max_old_space_size=400 app.js


// newReviews = []
// newPhotos = []
// reviews.value.forEach(review => {

//   review.meta_id = newMeta._id
//   newReviews.push(review)


// })

// photos.value.forEach(photo => {

//   photo.review_id = review.review_id
//   newPhotos.push(photo)

// })
// await this.create.many.reviews(newReviews)
// await this.create.many.photos(newPhotos)
// createdReviews += newReviews.length
// createdPhotos += newPhotos.length
