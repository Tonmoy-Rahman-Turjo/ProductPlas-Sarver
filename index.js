
const express = require('express');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const userCollections = client.db('products-controling').collection('users')

    app.post('/jwt', async (req, res) => {
      const users = req.body;
      const token = jwt.sign(users, process.env.EXCCESS_TOKEN, {
        expiresIn: '1h',
      })

      res.send({ token })
    })
   const veryfitoken = (req, res, next)=>{
     console.log(req.headers.authorization, 'inisde veryfi')
     if(!req.headers.authorization){
      return res.status(401).send({message: 'forbiden access user'})
     }
     const token = req.headers.authorization.split(' ')[1]
     jwt.verify(token, process.env.EXCCESS_TOKEN, (error, decoded )=>{
      if(error){
        return res.status(402).send({message:'forbiden token'})
      }
      req.decoded= decoded;
      next()
     })
   }
   
   const veryfiAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = {email: email}
    const user = await userCollections.findOne(query)
    const isAdmin = user.role === 'admin'
        if(!isAdmin){
        return  res.status(403).sen({message: 'forbiden access'})
        }
        next()
   }
   const verifyModerators = async (req, res, next) => {
    const email = req.decoded.email;
    const query = {email: email}
    const user = await userCollections.findOne(query)
    const isAdmin = user.role === 'admin'
        if(!isAdmin){
        return  res.status(403).sen({message: 'forbiden access'})
        }
        next()
   }
 
    app.post('/addproductse', async (req, res) => {

      const addProducts = req.body;
      const result = await products.insertOne(addProducts)
      res.send(result)
    })

    app.post('/user', async (req, res) => {

      const user = req.body;
      const userse = { email: user.email }
      const query = await userCollections.findOne(userse)
      if (query) {
        return res.send({ massage: "user all ready exit", insertedId: null })
      }
      const users = await userCollections.insertOne(user)
      res.send(users)

    })
    app.get('/alluser', veryfitoken, veryfiAdmin,   async (req, res) => {
      // console.log(req.headers)
      const allUser = await userCollections.find().toArray()
      res.send(allUser)
    })
    app.patch('/alluser/admin/:id', veryfitoken, veryfiAdmin, async (req, res) => {

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await userCollections.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.patch('/alluser/moderator/:id', veryfitoken, veryfiAdmin, async (req, res) => {

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "moderator"
        }
      }
      const result = await userCollections.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.get('/deshbord/myproduct/update/:id', async(req, res)=>{
      const result = await products.findOne({_id: new ObjectId(req.params.id)})
      res.send(result)
      
    } )
    app.put('/deshbord/myproduct/update/:id', async (req, res)=>{
      
      const id = req.params.id;
    const filter = {_id : new ObjectId(id)}
    const options = {upsert: true}
    const updated = req.body;
      const data ={
        $set:{
          productsName:updated.productsName,
          productsImg:updated.productsImg,
          description:updated.description, 
          displayName:updated.displayName, 
          ownerEmail:updated.ownerEmail,
          photoURL:updated.photoURL, 
          externalLinks:updated.externalLinks, 
          email:updated.email, 
             
        }
      }
      const result= await products.updateOne(filter, data,  options)
      res.send(result)
      
    })
    app.delete('/deshbord/myproduct/delete/:id', async(req, res) =>{
      const  result = await products.deleteOne({_id: new ObjectId(req.params.id)})
      // console.log(result)
      res.send(result)
    })
    app.get("/alluser/admin/:email", veryfitoken,  async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    
    app.get("/alluser/moderator/:email", veryfitoken,  async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollections.findOne(query);
      let moderator = false;
      if (user) {
        moderator = user?.role === "moderator";
      }
      res.send({ moderator });
    });

    app.get('/products', async (req, res) => {

      const products = await products.find().sort({ timestamp: -1 }).toArray(); // Sort products by timestamp in descending order
      res.json(products);

    })

    app.get('/mylist/:email', async (req, res) => {
      const result = await products.find({ email: req.params.email }).toArray()
      res.send(result)
    })
   
  } finally {
  
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('products is runing')
})
app.listen(port, () => {
  console.log(` products server  is runing on porst ${port}`)
})