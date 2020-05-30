const express = require('express');
const bodyparser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//middleware
app.use(bodyparser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//mongo url
const mongoURI = 'mongodb://sekinat:sek1111@ds219000.mlab.com:19000/imguploadtut';

//create mongo connections
const conn = mongoose.createConnection(mongoURI);

//init gfs
let gfs;
conn.once('open', () => {
  //init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
})

//create storage enbgine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buff) => {
        if (err){
          return reject(err);
        }
        const filename = buff.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads' //shpould match the collection name
        };
        resolve(fileInfo);
      });
    });
  }

})
const upload = multer({ storage })



//@route GET /
//@ desc loads form
app.get('/', (req, res) => {
  //res.render('index');
  gfs.files.find().toArray((err, files) => {
    //check if files
    if(!files || files.length === 0){
      res.render('index', {files: false});
    } else {
      files.map(file => {
        if(file.contentType==='image/jpeg' || file.contentType==='image/png'){
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', {files: files});
    }

    //files do exist
    //return res.json(files);
  }) 
});

//@route POST /upload
//@desc uploads file to db

app.post('/upload',upload.single('file'), (req, res) => { //single stakes the name of input in form
  res.redirect('/')
})

//@route GET /files
//desc display all files in json
app.get('/files', (req, res) =>{
  gfs.files.find().toArray((err, files) => {
    //check if files
    if(!files || files.length === 0){
      return res.status(404).json({
        err: 'No files exist'
      })
    }

    //files do exist
    return res.json(files);
  }) 
})
//
//@route GET /files/:filename
//desc get single file
app.get('/files/:filename', (req, res) =>{
  gfs.files.findOne({ filename: req.params.filename}, (err, file) => {
    //check if files
    if(!file || file.length === 0){
      return res.status(404).json({
        err: 'No file exist'
      });
    }
    //file exists
    return res.json(file);
  });
});

//@route GET /image/:filename
//desc get image
app.get('/image/:filename', (req, res) =>{
  gfs.files.findOne({ filename: req.params.filename}, (err, file) => {
    //check if files
    if(!file || file.length === 0){
      return res.status(404).json({
        err: 'No file exist'
      });
    }
    //check if image
    if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
      //read the output to browser
      const readstream = gfs.createReadStream(file.filename)
      readstream.pipe(res)
    } else {
      res.status(404).json({
        err: 'Not an image'
      })
    }
  });
});

//route DELETE /files/:id
//@desc deletes files by id
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads'}, (err, gridStore) => {
    if(err){
      return res.status(404).json({ err: err})
    }
    res.redirect('/');
  });
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));