var express = require('express');
var bodyParser = require('body-parser');
const Router = express.Router();
var article = require('../models/article');
Router.use(bodyParser.json());
var mongoose = require('mongoose');
var students = require('../models/userdetail');
var comments = require('../models/comment');
var category= require('../models/category');
var art_cat= require('../models/art_cat');
var replies = require('../models/reply');
var authenticate = require('../authenticate');
var follow = require('../models/follow');
var multer = require('multer');
var like = require('../models/likes')
// var multer2 = require('multer');
var path = require('path');
//for nodemailer
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nitk.article@gmail.com',
    pass: 'nitk@ita'
  }
});

//config multer

var storage = multer.diskStorage({
        destination:(req,file,cb)=>{
            cb(null,'uploads/')
        },
          filename:(req,file,cb)=>{
              console.log("**************************************");
              console.log(req.body);
              console.log(req.file);
              console.log("**************************************");
              cb(null, req.user._id+ '-' + Date.now() + path.extname(file.originalname));
          }

    }
);

const imageFileFilter = (req,file,cb)=>{
    if(!file.originalname.match(/\.(pdf)$/)){
        return cb(new Error('You can upload pdf files!'),false);
    }
    cb(null,true);
};
const upload = multer({storage:storage, fileFilter:imageFileFilter});


Router.route('/new_article')
    .get((req,res,next)=>{

        category.find()
            .exec((err, file) => {
                if (err) {
                    console.log(" in new_article page 1a ");
                    console.log(err);

                }
                else {
                    res.render('user/new_article',{category:file});
                }
            });


    })

    .post(upload.single('pdf'),(req,res,next)=>{

        students.findOne({ Index: req.user._id })
            .exec((err, file) => {
                if (err) {
                    console.log(" in new_article page 1a ");
                    console.log(err);
                    res.redirect('/user/profile')
                }
                else {
                    req.body.author = file._id;
                    console.log("-------------------------------------");
                    console.log(req.body);
                    console.log("-------------------------------------");
                    req.body.filename = req.file.filename;
                    follow.find({followed_to:file._id}).
                    exec((err,files)=>{
                        if(err) throw(err);
                        if(files){
                            console.log(files);
                            console.log(files.length);
                            var i;
                            for(i=0;i<files.length;i++){
                                students.findOne({_id:files[i].followed_by})
                                .exec((err,file1)=>{
                                    console.log(i);
                                    console.log(file1);
                                    if(err) throw(err);
                                    console.log("========email======")
                                     console.log(file1.email);
                                     console.log("========email======")
                                    if(1){
                                        var mailOptions = {
                                            from: 'nitk.article@gmail.com',
                                            to: file1.email,
                                            subject: 'REGARDING THE FOLLOWING OF THE AUTHOR :'+file.firstname+''+file.lastname,
                                            html:'<h1>THE AUTHOR YOU HAVE HAS JUST UPLOADED THE FILE:</h1><br>'+'<h2>'+req.body.title+'</h2>'
                                          };
                                          
                                          transporter.sendMail(mailOptions, function(error, info){
                                            if (error) {
                                              console.log(error);
                                            } else {
                                              console.log('Email sent: ' + info.response);
                                            }
                                          });
                                    }
                                })
                            }
                            
                        }
                    });
                    article.create(req.body)
                        .then((article)=>{
                            console.log("+++++++++++++++++++++++");
                            console.log(article);
                            console.log("+++++++++++++++++++++++");
                            var i=0;
                            var cats=req.body.category;
                            if(cats instanceof Array)
                            {
                                for (i = 0; i < cats.length; i++) {
                                    var id = mongoose.Types.ObjectId(cats[i]);
                                    var c = {
                                        'article': article._id,
                                        'category': id
                                    }
                                    art_cat.create(c)
                                        .then((a) => {
                                            console.log("++++++++++++111+++++++++++");
                                            console.log(a);
                                            console.log("++++++++++++111+++++++++++");

                                        }, (err) => next(err))
                                        .catch((err) => next(err));
                                }

                            }
                            else {


                                var id = mongoose.Types.ObjectId(cats);
                                var c = {
                                    'article': article._id,
                                    'category': id
                                }
                                art_cat.create(c)
                                    .then((a) => {
                                        console.log("+++++++++222++++++++++++++");
                                        console.log(a);

                                        console.log("+++++++++222++++++++++++++");

                                    }, (err) => next(err))
                                    .catch((err) => next(err));
                            }

                            res.redirect('/user/my_articles');
                        },(err) => next(err))
                        .catch((err)=>next(err));
       

                }
            });


    });


Router.get('/', function(req, res, next) {
    console.log("hoooooooo................");
    if(req.session)
    {
        students.findOne({Index:req.user._id})
        .exec((err,file)=>{
            if (err) throw err;
            else{
                if(file){
                    //to display no. of followers
                    follow.find({followed_to:file._id}).populate('followed_by')
                    .exec((err, followers)=>{
                        if (err) throw err;
                        console.log(followers)
                    
                    follow.find({followed_by:file._id}).populate('followed_to')
                    .exec((err,following)=>{
                        if(err) throw err;
                        console.log(following);
                    res.render('user/user_home',{followers:followers,following:following})

                    })

                    })

                }
            }
        })
        
        
        }
    else{
        res.redirect('/login');
    }

});


Router.get('/profile', function(req, res, next) {
    //var a = toString(req.user._id);
    //var id = mongoose.Types.ObjectId(a);
    console.log(" in profile page");
    if(req.user) {
        console.log(" in profile page 1 ");

        students.findOne({ Index: req.user._id })
            .exec((err, file) => {
                if (err) {
                    console.log(" in profile page 1a ");
                    console.log(err);
                    res.redirect('/user/edit_profile')
                }
                else {
                    if (file) {


                        console.log(" in profile page 1b ");

                        var articles=0;
                        var followers=0;
                        var following=0;
                        console.log(file);
                        article.count({
                            author: file._id

                        }, function (err, c) {
                            console.log("c = "+c);
                            articles=c;
                            console.log("art = "+articles);

                            follow.count({
                                followed_to: file._id


                            }, function (err, c) {
                                followers=c;

                                follow.count({
                                    followed_by: file._id


                                }, function (err, c) {
                                    following=c;
                                    like.find({liked_by : file._id})
                                    .exec((err,result)=>{
                                        console.log(result);

                                        likes = result.length;
                                        if(err) throw err;
                                        else{
                                        console.log(articles + " " +followers+" "+following+ " "+ likes);
                                    res.render('user/pro', {student: file,articles: articles,followers:followers,following:following,likes:likes});
                                        }
                                    })
                                    
                                    })
                                   



                                });

                            });

                        




                    }
                    else {
                        console.log(" in profile page 1c ");
                        res.redirect('user/edit_profile');
                    }
                }

            });
    }
    else
    {      console.log(" in profile page 2");
        res.redirect('/login');
    }

});


//Configuring for upload of images




Router.get('/logout',(req,res)=>{
    if(req.session){
        req.session.destroy();
        res.clearCookie('session-id');
        res.redirect('/');
    }
    else{
        var err = new Error('You are not logged in!');
        err.status = 403;
        next(err);
    }
});

Router.post('/new_category',(req,res)=>{
    var obj={
        'category':req.body.category
    }
    category.create(obj)
        .then((article)=>{
            console.log("+++++++++++++++++++++++");

            console.log("+++++++++++++++++++++++");
            res.redirect('/user/new_article');
        },(err) => next(err))
        .catch((err)=>next(err));
});


Router.get('/my_articles',(req,res)=>{



    students.findOne({ Index: req.user._id })
        .exec((err, file) => {
            if (err) {

                console.log(err);
                res.redirect('/login');
            }
            else {

                console.log(" in my article 1b ");


                article.find({ author: file._id})
                    .exec((err, articles) => {
                        if (err) {

                            console.log(err);
                            res.redirect('/user/profile');
                        }
                        else {
                            console.log(articles);
                            res.render('user/my_articles',{articles : articles});
                        }
                    });

            }

        });


});


Router.get('/my_articles/:id',(req,res)=> {

    article.findOne({ _id : req.params.id})
        .exec((err, articles) => {
            if (err) {

                console.log(err);
                res.redirect('/user/my_articles');
            }
            else {
                console.log(articles);
                comments.find({ article: req.params.id}).populate('student')
                    .exec((err, comments) => {
                        if (err) {

                            console.log(err);
                            res.redirect('/');
                        }
                        else {

                            replies.find({ article: req.params.id}).populate('student')
                                .exec((err, r) => {
                                    if (err) {

                                        console.log(err);
                                        res.redirect('/');
                                    }
                                    else {

                                        var message = req.flash('info');


                                        console.log("---------------------");
                                        console.log(r);
                                        res.render('user/my_article',{article : articles ,comments :comments ,reply: r,message:message});
                                    }
                                });



                        }
                    });

            }
        });

});

Router.post('/my_articles/:id',(req,res)=> {

    console.log("77777777777777777");
    console.log(req.params.id);
    console.log(req.body);
    console.log("77777777777777777");
    var obj={
        title: req.body.title,
        description:req.body.description,

    };
    article.findByIdAndUpdate( req.params.id,{$set:obj},(err,file)=>{
        if(err) throw err;
        else{
            console.log("99999999999999999");
            console.log(file);
            console.log("9999999999999");
            res.redirect('/user/my_articles/:id');
        }
    });



});






Router.post('/search', function(req, res, next) {
    if(req.body.keywords) {
        article.find({'title': {'$regex': req.body.keywords, '$options': 'i'}}).populate('author')
            .exec((err, file) => {
                if (err) throw err;
                else {
                    console.log(file);
                    res.render('user/search/articles',{articles :file});
                }
            });
    }
    else if(req.body.author){

        students.find({'firstname': {'$regex': req.body.author, '$options': 'i'}})
            .exec((err, file) => {
                if (err) throw err;
                else {
                    console.log(file);
                    res.render('user/search/authors',{authors :file});
                }
            });
    }
    else
    {
        article.find({'title': {'$regex': req.body.keywords, '$options': 'i'}}).populate('author')
            .exec((err, file) => {
                if (err) throw err;
                else {
                    console.log(file);
                    res.render('search/articles', {articles: file});
                }
            });
    }

});


//Ajax search of keywords
Router.post('/searchajax',(req,res)=>{
    article.find({'title':{ '$regex' : req.body.query, '$options' : 'i' }})
    .exec((err,file)=>{
        if (err) throw err;
        else
        {
            if(file.length!=0){
                var i;
                var output='';
                output='<ul class="list-unstyled">';
                for(i=0;i<file.length;i++ ){
                    output+='<li>'+file[i].title+'</li>'
                }
                output+='</ul>';
                res.send(output);
            }
           
        }
    })
})
// Ajax search for author
Router.post('/searchajax2',(req,res)=>{
    var a =req.body.query;
   students.find({$or:[{'firstname':{'$regex' : req.body.query2}},{'lastname':{ '$regex' : req.body.query2 }}]})
    .exec((err,file)=>{
        if (err) throw err;
        else
        {
            console.log(file);
            if(file.length!=0){
                var i;
                var output='';
                output='<ul class="list-unstyled">';
                for(i=0;i<file.length;i++ ){
                    output+='<li>'+file[i].firstname+'  '+file[i].lastname+'</li>'
                }
                output+='</ul>';
                res.send(output);
            }
           
        }
    })
})
//---------End of author ---------
Router.get('/search/articles/:id',(req,res)=> {

    article.findOne({ _id : req.params.id}).populate('author')
        .exec((err, articles) => {
            if (err) {

                console.log(err);
                res.redirect('/');
            }
            else {
                comments.find({ article: req.params.id}).populate('student')
                    .exec((err, comments) => {
                        if (err) {

                            console.log(err);
                            res.redirect('/');
                        }
                        else {

                            replies.find({ article: req.params.id}).populate('student')
                                .exec((err, r) => {
                                    if (err) {

                                        console.log(err);
                                        res.redirect('/');
                                    }
                                    else {
                                        console.log("---------------------");
                                        console.log(r);
                                        like.find({liked_article:req.params.id})
                                        .exec((err,like)=>{
                                            if(err) throw err;
                                            else{
                                               var likes = like.length;
                                            res.render('user/search/article',{article : articles ,comments :comments ,reply: r,likes:likes});
                                            }
                                        })
                                        
                                    }
                                });



                        }
                    });

            }
        });

});


Router.post('/search/articles/:id/comment',(req,res)=> {

    students.findOne({ Index: req.user._id})
        .exec((err, student) => {
            if (err) {
                console.log(" entered 1 ");
                console.log(err);
                res.redirect('/login');
            }
            else {
                console.log(" entered 2");
                var obj={

                  comment: req.body.comment,
                  article: mongoose.Types.ObjectId(req.params.id),
                  student:student._id
                };

               console.log(obj);
               console.log(student);

                comments.create(obj, function (err, comm) {
                    if (err) {
                        console.log(" entered 3");
                        console.log(err);
                        res.redirect('/user/search/articles/:id');
                    }
                    else
                    {
                        console.log(" entered 1 ");
                        var url='/user/search/articles/'+req.params.id;
                        res.redirect(url);
                    }

                });

            }
        });

});


Router.post('/search/articles/:id/:cid/reply',(req,res)=> {

    students.findOne({ Index: req.user._id})
        .exec((err, student) => {
            if (err) {
                console.log(" entered 1 ");
                console.log(err);
                res.redirect('/login');
            }
            else {
                console.log(" entered 2");
                comments.findOne({ _id: req.params.comment_id})
                    .exec((err, comment) => {
                        if (err) {
                            console.log(" entered 2 ");
                            console.log(err);
                            var ur='/search/articles/'+req.params.id;
                            res.redirect(ur);
                        }
                        else {

                            var obj={

                                reply: req.body.comment,
                                article: mongoose.Types.ObjectId(req.params.id),
                                comment: mongoose.Types.ObjectId(req.params.cid),
                                student:student._id
                            };



                            replies.create(obj, function (err, r) {
                                if (err) {
                                    console.log(" entered 3");
                                    console.log(err);
                                    res.redirect('/user/search/articles/'+req.params.id);
                                }
                                else
                                {
                                    console.log(" entered 4 ");
                                    var url='/user/search/articles/'+req.params.id;
                                    res.redirect(url);
                                }

                            });

                        }

                    });

            }
        });

});

// For the process of following
Router.post('/search/author/:id/follow',(req,res,next)=>{

    students.findOne({ Index: req.user._id })
        .exec((err, s) => {
            if (err) {
                console.log(" in profile page 1a ");
                console.log(err);
                res.redirect('/user/edit_profile')
            }
            else {
                req.body.followed_by = s._id;
                 req.body.followed_to = req.params.id;
            
        
        console.log(req.body.followed_by, req.body.followed_to);
        follow.findOne({followed_by:s._id,followed_to:req.params.id})
        .exec((err,file)=>{
            if(file){
                console.log("You have already followed the given author");
                // var a = "You have already followed the given author";
                var url = '/user/search/author/'+req.params.id;
                req.flash("info","You have already followed the given author");
                res.redirect(url);
            }
            else{
                    follow.create(req.body)
                    .then((file)=>{
                        console.log("One follower Inserted After checking ");
                        var a ="You have successfully followed the author";
                        req.flash("info","You have successfully followed the author");
                        var url = '/user/search/author/'+req.params.id;
                        res.redirect(url)
                    },(err)=>next(err))
                    .catch((err)=>next(err));
                
            }
        })
  

        }
    });
});


Router.get('/search/author/:id/articles',(req,res)=> {

    article.find({'author':req.params.id }).populate('author')
        .exec((err, file) => {
            if (err) throw err;
            else {
                console.log(file);
                res.render('user/search/articles', {articles: file});
            }
        });

});



Router.get('/search/author/:id',(req,res)=> {

    students.findOne({ _id : req.params.id})
        .exec((err, file) => {
            if (err) {

                console.log(err);
                res.redirect('/');
            }
            else {

                if (file) {
                    if (file.Index.equals(req.user._id)) {
                        res.redirect('/user/profile');

                    } else {

                            console.log(" in profile page 1b ");

                            var articles=0;
                        var followers=0;
                        var following=0;
                        console.log(file);
                        article.count({
                            author: file._id

                        }, function (err, c) {
                            console.log("c = "+c);
                            articles=c;
                            console.log("art = "+articles);

                            follow.count({
                                followed_to: file._id


                            }, function (err, c) {
                                followers=c;

                                follow.count({
                                    followed_by: file._id


                                }, function (err, c) {
                                    following=c;
                                    like.count({liked_by:file._id})
                                        .exec((err,likes)=>{



                                        if(err) throw err;
                                        else{
                                            var message = req.flash('info');
                                            console.log(file);
                                            console.log(req.flash('info'))
                    
                                        console.log(articles + " " +followers+" "+following+ " "+ likes);
                                    res.render('user/search/author', {student: file,message:message,articles: articles,followers:followers,following:following,likes:likes});
                                        }
                                    })
                                    
                                    })
                                   



                                });

                            });

                        
                            
                     }
                }
                else {
                    console.log(" in profile page 1c ");
                    res.redirect('user/');
                }

            }
        });

});
// for the sake of like
Router.post('/search/articles/:id/like',(req,res)=>{
        students.findOne({Index:req.user._id})
        .exec((err,student)=>{
        article.findOne({_id:req.params.id,author:student._id})
        .exec((err,result)=>{
            if(err) throw err;
            else{
                if(!result){
                    if(err) throw err;
                like.findOne({liked_by:student._id,liked_article:req.params.id})
                .exec((err,file)=>{
                    if(!file){
                    like.create({liked_by:student._id,liked_article:req.params.id})
                    .then((like)=>{
                        console.log("+++++++++++++++++++++++");
                        console.log(like);
                        console.log("+++++++++++++++++++++++");
                    res.send("<p style='color:red'>You liked this article</p>");
                    },(err) => next(err))
                    .catch((err)=>next(err));
                    }
                    else{
                        res.send("<p style='color:red'>You already liked this article</p>");
                    }
        })

                }
                else{
                    res.send("<p style='color:red'>You can't like this article</p>")
                }
            }
        })
        
        // req.body.liked_to = file._id;
        // req.body.liked_article = req.params.id;
       
    })
    })



module.exports=Router;