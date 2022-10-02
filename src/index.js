//const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { generatemsg, generateLocation } = require('./utils/messages')


const { addUser, removeUser, getUser, getUserInRoom } = require('./utils/users')
const passportSetup = require('../config/passport-setup');
const authRoutes = require('../routes/auth_routes');
const profileRoutes = require('../routes/profile-routes');
const mongoose = require('mongoose');
//const keys = require('../config/keys');
const cookieSession = require('cookie-session');
const passport = require('passport');
const session = require('express-session');
require('dotenv').config()

const app = express()
const server = http.createServer(app)
const io = socketio(server)

// const PORT = process.env.PORT
// const HOST = "localhost"
//server.listen(3000);

// set up session cookies
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [process.env.cookieKey]
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

const db = process.env.dbURL;

//connect to mongodb
mongoose.connect(db, () => {
    console.log('connected to monodb');
});

//set the views
app.set('view engine', 'ejs');

//set the routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes); //this is entry page

app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});
//index is the start page
app.get('/chat', (req, res) => {
    res.render('chat', { user: req.user });
})
app.get('/about', (req, res) => {
    res.render('about', { user: req.user });
})
app.get('/project', (req, res) => {
    res.render('project', { user: req.user });
})


//const publicdir = path.join(__dirname, '../public')
port = process.env.PORT
host = process.env.HOST
app.use(express.static('public'));
server.listen(port, host, () => {
        console.log("server s up " + port)
    })
    // const path = require('path')
    // app.use('/static', express.static(path.join(__dirname, 'public')))


//app.use(express.static(publicdir))


io.on("connection", (socket) => {
        console.log("new connection")

        socket.on("join", ({ username, room }, cb) => {

            const { error, user } = addUser({ id: socket.id, username, room })

            if (error) {
                return cb(error)
            }
            socket.join(user.room)
            socket.emit("message", generatemsg("Admin ,Welcome"))
            socket.broadcast.to(user.room).emit("message", generatemsg(`Admin ${user.username} has joined!`))

            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUserInRoom(user.room)
            })
            cb()
        })

        socket.on("sendMessage", (msg, cb) => {
            const user = getUser(socket.id)
            io.to(user.room).emit("message", generatemsg(user.username, msg))
            cb()
        })

        socket.on("sendLocation", (location, cb) => {
            const user = getUser(socket.id)
            console.log(user)
            io.to(user.room).emit("locationurl", generateLocation(user.username, `https://www.google.com/maps?q=${location.latitude},${location.longitude}`))
            cb()
        })

        socket.on("disconnect", () => {
            const user = removeUser(socket.id)
            console.log(user)
            if (user) {
                io.to(user.room).emit("message", generatemsg(`Admin ${user.username} A user  has left`))

                io.to(user.room).emit("roomData", {
                    room: user.room,
                    users: getUserInRoom(user.room)
                })
            }

        })


    })
    // server.listen(PORT, () => {
    //     console.log("server s up" + PORT)
    // })