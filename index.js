
const express = require('express');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');



require('dotenv').config()
const stripe = require('stripe')(process.env.SPRITE_SECRET_KEY)
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
    const userpaymentCollecations = client.db('products-controling').collection('paymentsColetions')

    app.post('/jwt', async (req, res) => {
      const users = req.body;
      const token = jwt.sign(users, process.env.EXCCESS_TOKEN, {
        expiresIn: '1h',
      })

      res.send({ token })
    })
   const veryfitoken = (req, res, next)=>{
    //  console.log(req.headers.authorization, 'inisde veryfi')
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
    const isModerator = user.role === 'moderator'
        if(!isModerator){
        return  res.status(403).sen({message: 'forbiden access'})
        }
        next()
   }
 
    app.post('/addproductse', async (req, res) => {

      const addProducts = req.body;
      const result = await products.insertOne(addProducts)
      res.send(result)
    })
    app.get("/allproduct", async (req, res) => {
      const result = await products.find().toArray();
      res.send(result);
    });
    app.get("/allProducts/:id", veryfitoken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.findOne(query);
      res.send(result);
    });


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
    app.patch('/alluser/moderator/:id', veryfitoken, verifyModerators, async (req, res) => {

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
    app.put("/voteCount/:id", veryfitoken, async (req, res) => {
      const id = req.params.id;
      const userEmail = req.body.userEmail;
      const query = { _id: new ObjectId(id) };

      try {
        const findProduct = await products.findOne(query);

        if (findProduct.voters && findProduct.voters.includes(userEmail)) {
          return;
        }

        const updatedDoc = {
          $inc: { upVote: 1 },
          $push: { voters: userEmail },
        };

        const result = await products.updateOne(query, {
          $inc: { upVote: 1 },
          $push: { voters: userEmail },
        });

        res.status(200).json(result);
      } catch (error) {
        console.error("Error while updating vote count:", error);
      }
    });
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

    // app.get('/products', async (req, res) => {

    //   const products = await products.find().sort({ timestamp: -1 }).toArray(); // Sort products by timestamp in descending order
    //   res.json(products);

    // })
    app.get("/featuredProducts", async (req, res) => {
      const result = await products.find({
        ProductType: "Featured",
      })
        .sort({ timestamp: -1 })
        .toArray();
      res.send(result);
    });

// change pending product status to Accepted

app.put('/accepteduserproduct/:id', veryfitoken, verifyModerators, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const newStatus = "Accepted";

    try {
      const result = await products.updateOne(filter, {
        $set: { ProductStatus: newStatus },
      });

      if (result.modifiedCount > 0) {
        res.status(200).json({ message: "Product status updated successfully" });
      } else {
        res.status(404).json({ message: "Product not found or status not updated" });
      }
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
app.put('/rejecteduserproduct/:id', veryfitoken, verifyModerators, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const newStatus = "Rejected";

    try {
      const result = await products.updateOne(filter, {
        $set: { ProductStatus: newStatus },
      });

      if (result.modifiedCount > 0) {
        res.json({ message: "Product status updated successfully" });
      } else {
        res.status(404).json({ message: "Product not found or status not updated" });
      }
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);


    app.put('/productdseType/:id', veryfitoken, verifyModerators,async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const newType = "Featured";
 try {
          const result = await products.updateOne(filter, {
            $set: { ProductType: newType },
          });

          if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Product Type Updated successfully" });
          } else {
            res.status(404).json({ message: "Product not found or Type not updated" });
          }
        } catch (error) {
          console.error("Error updating product Type:", error);
          res.status(500).json({ message: "Internal server error" });
        }
      }
    );
    app.get("/reportdProduct",veryfitoken, verifyModerators,
      async (req, res) => {
        const result = await products.find({ ProductFeedback: "Reported",
        }).toArray();
        res.send(result);
      }
    );
    app.delete("/producted/:id", veryfitoken, verifyModerators,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.deleteOne(query);
      res.send(result);
    }
  );
    app.put("/reportdProduct/:id", veryfitoken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const userFeedback = "Reported";
     
      try {
        const result = await products.updateOne(filter, {
          $set: { ProductFeedback: userFeedback },
        });

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Product Feedback updated successfully" });
        } else {
          res
            .status(404)
            .json({ message: "Product not found or Feedback not updated" });
        }
      } catch (error) {
        console.error("Error updating product Feedback:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

   
    app.post("/create-payment-intent", veryfitoken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/user/payments/:email", async (req, res) => {
      const payment = req.body;
      console.log(req.params.email)
      const email = req.params.email;
      const updatedDocs= {$set:{
      isMember: true,
      }}
      const updauser= await userCollections.updateOne({email}, updatedDocs)
      res.send(updauser)});
    
    app.get('/alluser/member/:email', veryfitoken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollections.findOne(query);
      let member = false;
      if (user) {
        member = user?.isMember === true;
      }
      res.send({ member });
    });

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