const host = process.env.HOST || '0.0.0.0'
const port = process.argv[2] || 8082
const fs = require('fs')
// const path = require('path')
const {
    exec
} = require('child_process')
// const app = require('express')()
const express = require('express')
const app = express()
// var http = require('http').createServer(app);
const cors = require('cors')
const consola = require('consola')

app.set('port', port)
app.use(express.json())
app.use(cors())

const io = require('socket.io').listen(app.listen(port, host));
var socket = require('socket.io')();
io.on('connection', socket => {
    console.log('client connected', socket.id)
    io.to(socket.id).emit('yoyo', socket.id)
    socket.on('disconnect', function(){
        console.log('client disconnected', socket.id);
      });
});
// app.listen(port, host)
consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
})

// routes
app.use('/', express.static('frontend/dist'));

let data = [
    "/api/list",
    "/api/list/:id|name",
    "/api/add/:name",
    "/api/delete/:id|name",
    "/api/restart/:id|name"
]

// /list
app.get('/api', cors(), (req, res) => {
    console.log('/api hit')
    res.json(data)
})

// /list
app.get('/api/list', cors(), (req, res) => {
    console.log('/api/list hit')
    exec('pm2 jlist', (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }

        //   console.log(`${stdout}`);
        let list = JSON.parse(stdout)
        let newList = []
        list.forEach(item => {
            newList.push({
                id: item.pm_id,
                name: item.name,
                pid: item.pid,
                running: (item.pid > 0 && item.monit.memory > 0)
            })
            // console.log(item)
        });
        res.json(newList)
    });
})

// /list/:id|name
app.get('/api/list/:id', cors(), (req, res) => {
    console.log('/api/list/:id|name hit')
    let id = req.params.id
    exec('pm2 jlist', (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }
        let data = JSON.parse(stdout).find(item => (item.name === id | item.pm_id == id))
        if (data == undefined) {
            res.json({
                message: `${id} does not exist`
            })
        }
        console.log(`${data}`);
        res.json(data)
    });
})

app.get('/api/status/:id', cors(), (req, res) => {
    console.log('/api/status/:id|name hit')
    let id = req.params.id
    exec('pm2 jlist', (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }
        let data = JSON.parse(stdout).find(item => (item.name === id | item.pm_id == id))
        if (data == undefined) {
            res.json({
                message: `${id} does not exist`
            })
        }
        console.log(`${data}`);
        if (data.pid > 0 && data.monit.memory > 0) {
            res.json({
                running: true
            })
        } else {
            res.json({
                running: false
            })
        }
    });
})

// /delete/<name|id>
app.get('/api/delete/:id', cors(), (req, res) => {
    let id = req.params.id
    console.log(`/api/delete/${id} hit`)
    exec(`pm2 delete ${id}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            // return;
            res.json({
                error: !err.killed,
                message: `id or name '${id}' could not be deleted or does not exist`
            })
        } else {
            save()
            //   console.log(`${stdout}`);
            res.json(
                // {stdout}
                {
                    success: true
                }
            )

        }

    });
})

// /restart/<name|id>
app.get(['/api/restart/:id', '/api/start/:id'], cors(), (req, res) => {
    let id = req.params.id
    console.log(`/api/restart/${id} hit`)
    exec(`pm2 restart ${id}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            res.json({
                error: !err.killed,
                message: `id or name '${id}' could not be restarted or does not exist`
            })
        } else {
            save()
            //   console.log(`${stdout}`);
            res.json(
                // {stdout}
                {
                    success: true
                }
            )

        }

    });
})

// /restart/<name|id>
app.get('/api/stop/:id', cors(), (req, res) => {
    let id = req.params.id
    console.log(`/api/stop/${id} hit`)
    exec(`pm2 stop ${id}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            res.json({
                error: !err.killed,
                message: `id or name '${id}' could not be restarted or does not exist`
            })
        } else {
            save()
            //   console.log(`${stdout}`);
            res.json(
                // {stdout}
                {
                    success: true
                }
            )

        }

    });
})

// POST /add body = {name, port}
// todo later add gh url
// /add/<name|id>
app.post('/api/add', cors(), (req, res) => {
    let name = req.body.name
    let port = req.body.port
    console.log(name)
    console.log(port)
    let apppath = "/home/pi/cloudKiPi/apps/"
    let command = `cd ${apppath}${name} && pm2 start -n ${name} npm -- start ${port}`
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error(`exec error: ${err}`);
            return;
        }
        console.log(`${stdout}`);
        save()
        res.json(
            `${stdout}`
            // JSON.parse(stdout)
        )
    });
    // res.json({
    //     command
    // })
})

// /startup
app.get('/api/save', cors(), (req, res) => {
    // console.log('/api/save hit')
    // exec('pm2 save -u pi', (err, stdout, stderr) => {
    //     if (err) {
    //         console.error(`exec error: ${err}`);
    //         return;
    //     }
    //     console.log(`${stdout}`);
    //     let file = stdout.trim().replace("[PM2] Saving current process list...\n[PM2] Successfully saved in ", "")
    //     let rawdata = fs.readFileSync(file);
    //     let data = JSON.parse(rawdata);
    //     // console.log(data);
    //     res.json(
    //         // JSON.parse(stdout)
    //         data
    //     )
    // });
    save()
    res.json(
        // JSON.parse(stdout)
        {
            saved: true
        }
    )
})

function save() {
    exec('pm2 save -u pi')
}