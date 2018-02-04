
const express = require('express')
const app = express()
const assert = require('assert')
const bodyParser = require('body-parser')

app.use(bodyParser.json())

exports.server

//INVENTORY DATABASE
// const inventoryDb = require('../databases/mongo-inventory/index.js')
const MongoClient = require('mongodb').MongoClient
var db, inventory
// const departments = require('../databases/mongo-inventory/dataGenerator.js')

//connect to MongoDB on start
MongoClient.connect('mongodb://localhost:27017/backazon', (err, client) => {
  if (err) {
    console.log('Unable to connect to Mongo')
    process.exit(1)
  } else {
    db = client.db('backazon')
    inventory = db.collection('inventory')

    // // mongo text index
    // inventory.ensureIndex({name:1, description:1, category:1, subcategory:1, department:1}, () => {
    //   console.log('Inventory Text Index: name, description, category, subcategory, department')
    // })
    // inventory.ensureIndex({ name: "text", description: "text", category: "text", subcategory: "text", department: "text"}, {name: "InventoryTextIndex"})

    server = app.listen(3000, function() {
      console.log('Listening on port 3000...')
    })
  }
})

/***************************************************************************
TODO: move to CACHE for Ben & Austin (will require POST to cache on daily basis)

GET request to '/trending', when client visits Backazon homepage
  Request object from client: 
    { empty }
  Response object:
    {
      [ summarized item objects ]
    }
*/
app.get('/trending', (req, res) => {

  inventory
    .find({ })
    .sort({ avg_rating: -1, review_count: -1 })
    .limit(3000)
    .toArray((err, result) => {
      if (err) throw err
      console.log(result)
      res.status(200).send(result)
    })

})

/***************************************************************************
 TODO: send update to user analytics, format:
   {
     UserID    : 123,
     ProductID : 123,
     Viewed    : Boolean,
     Clicked   : Boolean,
     Purchased : Boolean,
     Cart      : Boolean,
     Wishlist  : Boolean,
     Timestamp : dateTime
   }

GET request to '/details', when client clicks on product for more info
Request object from client:
{
  userId: 000000,
  itemId: 000000
}
Response object: 
{
  { full item details object }
}
*/
app.get('/details', (req, res) => {

  var itemId = parseInt(req.query.item_id)
  
  inventory.findOne({item_id: itemId}, (err, doc) => {
    if (err) res.status(400).json('Could not find item')

    assert.equal(null, err)
    assert.ok(doc != null)

    res.status(200).send(doc)
  })
})

/***************************************************************************
TODO: move to queue (will require GET from queue request)

POST request to '/newitem', when client submits new item to be hosted on Backazon
  Request object from client: 
    {
      { full product details }
    }
  Response status: 200
*/
app.post('/newitem', (req, res) => {

  var newItem = {
    item_id: parseInt(req.body.item_id),
    name: req.body.name,
    description: req.body.description,
    price: parseInt(req.body.price),
    color: req.body.color,
    size: req.body.size,
    inventory: 1,
    avg_rating: 0,
    review_count: 0,
    image_url: req.body.image_url,
    category: req.body.category,
    subcategory: req.body.subcategory,
    department: req.body.department,
    creation_date: new Date()
  }

  inventory.insertOne(newItem, (err, result) => {
    assert.equal(null, err)
    assert.equal(1, result.insertedCount)

    res.status(200).send('New item successfully added')
  })
})

/***************************************************************************
TODO: confirm data object with Chase

POST request to '/sales', when orders service receives new sales transaction
  Request object from orders service: 
    data: {
      userid: #,
      items: [
      {itemid:123, qty:2, rating: 4},
      {itemid:1234, qty:1, rating: 5}
      ]
    }
  Response status: 200
*/
app.post('/sales', (req, res) => {

  var soldItems = req.body.items 

  for (var i = 0; i < soldItems.length; i++) {
    let itemId = soldItems[i].itemid
    let qtySold = soldItems[i].qty

    inventory.updateOne({ item_id: parseInt(itemId) }, { $inc: { inventory: -(parseInt(qtySold)) } }, (err, result) => {
      assert.equal(null, err)
      assert.equal(1, result.result.nModified)
    })
  }

  res.status(200).send('Inventory successfully updated')

  //TESTING
  //get item's initial inventory 
  //run update query
  //check new inventory against original 
})

/***************************************************************************
TODO: move in ElasticSearch or query from cache?
TODO: send update to user analytics

GET request to '/department', when client clicks on category/department
Request object from client:
{
  query: category/brand/department string
}
Response object: 
{
  [ summarized item objects ]
}
*/
app.get('/department', (req, res) => {
  
  var dept = req.query.department
  
  inventory
    .find({ department: JSON.parse(dept) })
    .sort({ avg_rating: -1, review_count: -1 })
    .limit(100)
    .toArray((err, results) => {
      if (err) throw err
      res.status(200).send(results)
    })
})

/***************************************************************************
TODO; auto-suggestions?
TODO: send update to user analytics (TBD - check with Ben on format)

GET request to '/search', when client submits search query in search box
Request object from client:
{
  query: search string
}
Response object:
{
  [ summarized item objects ]
}
*/
app.get('/search', (req, res) => {

  var query = req.query.search
  
  inventory
  .find({ $text: { $search: query } })
  .sort({ avg_rating: -1, review_count: -1 })
  .limit(100)
  .toArray((err, results) => {
    if (err) throw err
    res.status(200).send(results)
  })
})

/***************************************************************************
TODO: move to cache, confirm Austin & Ben's request to '/trending'

GET request to '/trending', when filter service requests trending items of day
  Request object from filter service:
    { empty }
  Response object: 
    { 
      [ summarized item objects ]
    }
*/

