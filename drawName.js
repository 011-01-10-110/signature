/**
 * 辅助类
 * 存储鼠标位置及画的状态
 * @constructor
 */
var DrawMouse = (function () {
    function DrawMouse({historyLength =10}) {
        this.oldX = -10
        this.oldY = -10
        this.isOn = false
        this.cur = []
        this.curStack = []
        this.historyStack = []
        this.historyLength = historyLength
    }
    DrawMouse.prototype.setOld = function (X, Y, on=true) {
        if (on === true) {
            this.cur.push({
                x: this.oldX,
                y: this.oldY,
                nx: X,
                ny: Y
            })
        } else {
            this.addHistory([...this.cur])
            this.cur = []
        }
        this.oldX = X
        this.oldY = Y
        this.isOn = on
    }
    DrawMouse.prototype.getOld = function () {
        return {
            oldX: this.oldX,
            oldY: this.oldY,
            isOn: this.isOn
        }
    }
    DrawMouse.prototype.addHistory = function (cur) {
        let lastStep = {cur, flag: true}
        if (this.historyStack.length === this.historyLength) {
            this.historyStack.shift()
            this.curStack.shift()
        }
        if (this.curStack.length < this.historyStack.length
            && this.curStack.length !== 0) {
            this.historyStack = [...this.curStack,lastStep]
        } else {
            this.historyStack.push(lastStep)
        }
        this.curStack = [...this.historyStack]
    }
    DrawMouse.prototype.getHistory = function () {
        return [...this.historyStack]
    }
    DrawMouse.prototype.upStep = function () {
        let cur = this.historyStack.filter(i => i.flag)
        if (cur.length === 0) {
            return []
        }
        this.historyStack[cur.length - 1].flag = false
        this.curStack = cur.slice(0, cur.length - 1)
        return [...this.curStack]
    }
    DrawMouse.prototype.nextStep = function () {
        let cur = this.historyStack.filter(i => i.flag)
        if (cur.length === this.historyStack.length) {
            return this.historyStack
        }
        this.historyStack[cur.length].flag = true
        this.curStack = this.historyStack.filter(i => i.flag)
        return [...this.curStack]
    }
    DrawMouse.prototype.clearHistory = function () {
        this.cur = []
        this.curStack = []
        this.historyStack = []
    }
    return DrawMouse
})()

/**
 * 手写板类
 * @param width 手写板宽度
 * @param height 手写板高度
 * @param lineW 线粗
 * @param lineColor 线颜色
 * @param bgColor 手写板颜色
 * @param El canvas节点Dom元素
 * @param historyLength 历史记录条数
 * @constructor
 */
var Draw = (function () {
    function Draw ({width = 300, height = 300, lineW = 4, lineColor = 'white', bgColor = 'block', El, historyLength=10}) {
        this.width = width
        this.height = height
        this.lineW = lineW
        this.lineColor = lineColor
        this.bgColor = bgColor
        this.El = El
        this.ctx = null
        this.drawMouse = new DrawMouse({historyLength: historyLength})
        this.init()
    }
    Draw.prototype.dataUrl = function (mime) {
        const canvas = this.El
        return canvas.toDataURL(mime)
    }
    Draw.prototype.dataURLtoBlob = function (dataUrl, filename='canvas') {
        let arr = dataUrl.split(',')
        let mime = arr[0].match(/:(.*?);/)[1]
        let bstr = atob(arr[1])
        let n = bstr.length
        let u8arr = new Uint8Array(n)
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
        }
        return new Blob([u8arr], {type: mime})
    }
    Draw.prototype.dataURLtoFile = function (dataUrl, filename='canvas') {
        const blob = this.dataURLtoBlob(dataUrl, filename)
        blob.lastModifiedDate = new Date()
        blob.name = filename
        return blob
    }
    Draw.prototype.downLoadUrl = function (dataUrl, filename='canvas') {
        const file = this.dataURLtoFile(dataUrl, filename)
        return URL.createObjectURL(file)
    }
    Draw.prototype.save = function (mime='image/jpeg', filename) {
        const base = this.dataUrl(mime)
        return this.downLoadUrl(base, filename)
    }
    Draw.prototype.init = function () {
        // 获取canvas
        let canvas = this.El
        canvas.width = this.width
        canvas.height = this.height
        // 创建ctx对象
        this.ctx = canvas.getContext('2d')
        this.ctx.fillStyle = this.bgColor
        this.ctx.fillRect(0,0,this.width,this.height)
        canvas.addEventListener('mousedown', (e) => {
            this.drawMouse.setOld(e.pageX, e.pageY)
        }, true)
        canvas.addEventListener('mousemove',  (e) => {
            const oldD = this.drawMouse.getOld()
            if (oldD.isOn) {
                const nX = e.pageX
                const nY = e.pageY
                this.ctx.beginPath()
                this.ctx.strokeStyle = this.lineColor
                this.ctx.lineWidth = this.lineW
                this.ctx.lineCap = 'round'
                this.ctx.moveTo(oldD.oldX, oldD.oldY)
                this.ctx.lineTo(nX, nY)
                this.ctx.stroke()
                this.drawMouse.setOld(nX, nY)
            }
        }, false)
        canvas.addEventListener('mouseup', () => {
            this.drawMouse.setOld(-10, -10, false)
        }, false)
        canvas.addEventListener('mouseleave', () => {
            if (this.drawMouse.isOn) {
                this.drawMouse.setOld(-10, -10, false)
            }
        }, false)
    }
    Draw.prototype.clear = function () {
        this.drawMouse.addHistory([{
            step: 'clear'
        }])
        this.ctx.fillRect(0,0,this.width,this.height)
    }
    Draw.prototype.getHistory = function () {
        return this.drawMouse.getHistory()
    }
    Draw.prototype.upStep = function () {
        const draw = this.drawMouse.upStep()
        this.drawBatch(draw)
        return [...this.drawMouse.historyStack]
    }
    Draw.prototype.nextStep = function () {
        const draw = this.drawMouse.nextStep()
        this.drawBatch(draw)
        return [...this.drawMouse.historyStack]
    }
    Draw.prototype.drawBatch = function (draw) {
        this.ctx.fillRect(0,0,this.width,this.height)
        for (let i = 0; i < draw.length; i++) {
            const item = [...draw[i].cur]
            if (item[0]?.step === 'clear') {
                this.ctx.fillRect(0,0,this.width,this.height)
                continue
            }
            item.shift()
            for (let j = 0; j < item.length; j++) {
                const cur = item[j]
                this.ctx.beginPath()
                this.ctx.strokeStyle = this.lineColor
                this.ctx.lineWidth = this.lineW
                this.ctx.lineCap = 'round'
                this.ctx.moveTo(cur.x, cur.y)
                this.ctx.lineTo(cur.nx, cur.ny)
                this.ctx.stroke()
            }
        }
    }
    Draw.prototype.clearHistory = function () {
        this.drawMouse.clearHistory()
    }
    return Draw
})()