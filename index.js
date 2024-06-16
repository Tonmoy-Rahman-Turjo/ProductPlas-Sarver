
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qe87fgi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const products = client.db('products-controling').collection('addProducts')
    app.post('/addproductse',  async(req, res)=>{
        
        const addProducts = req.body;
          const result =  await  products.insertOne(addProducts)
          res.send(result)
    })



    app.get('/products', async (req, res) => {
     
        const products = await products.find().sort({ timestamp: -1 }).toArray(); // Sort products by timestamp in descending order
        res.json(products);
    
      })

      app.get('/mylist/:email', async (req, res)=>{
        const result = await products.find({email:req.params.email}).toArray()
        res.send(result) 
      })
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) =>{
    res.send('products is runing')
})
app.listen(port , () =>{
    console.log(` products server  is runing on porst ${port}` )
})