const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser,removeUser,getUser,getUsersInRomm } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

//let count = 0

io.on('connection', (socket) => {
    console.log('New Websocket connection')

    socket.on('join', (options, callback) => {
        // When new user joins a room
        const {error, user } = addUser({id: socket.id,...options})
        if(error) {
           return callback(error)
        }
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))

        // List of users in room
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRomm(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (clientMessage, callback) => {

        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(clientMessage)) {
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message', generateMessage(user.username,clientMessage))
        callback()
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
       const user = removeUser(socket.id)

       if(user) {
        io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRomm(user.room)
        })
       }
        
    })
})

server.listen(port, () => {
    console.log('Server is up and running on port:' + port)
})