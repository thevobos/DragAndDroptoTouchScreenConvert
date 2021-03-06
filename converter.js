    var DragDropTouch;
    (function (DragDropTouch_1) {
        'use strict';

        var DataTransfer = (function () {

            function DataTransfer() {
                console.log('goyt here')

                this._dropEffect = 'move';
                this._effectAllowed = 'all';
                this._data = {};
            }
            Object.defineProperty(DataTransfer.prototype, "dropEffect", {

                get: function () {
                    return this._dropEffect;
                },
                set: function (value) {
                    this._dropEffect = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DataTransfer.prototype, "effectAllowed", {

                get: function () {
                    return this._effectAllowed;
                },
                set: function (value) {
                    this._effectAllowed = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DataTransfer.prototype, "types", {

                get: function () {
                    return Object.keys(this._data);
                },
                enumerable: true,
                configurable: true
            });

            DataTransfer.prototype.clearData = function (type) {
                if (type != null) {
                    delete this._data[type];
                }
                else {
                    this._data = null;
                }
            };

            DataTransfer.prototype.getData = function (type) {
                return this._data[type] || '';
            };

            DataTransfer.prototype.setData = function (type, value) {
                this._data[type] = value;
            };

            DataTransfer.prototype.setDragImage = function (img, offsetX, offsetY) {
                var ddt = DragDropTouch._instance;
                ddt._imgCustom = img;
                ddt._imgOffset = { x: offsetX, y: offsetY };
            };
            return DataTransfer;
        }());
        DragDropTouch_1.DataTransfer = DataTransfer;

        var DragDropTouch = (function () {

            function DragDropTouch() {
                this._lastClick = 0;
                if (DragDropTouch._instance) {
                    throw 'DragDropTouch instance already created.';
                }

                var supportsPassive = false;
                document.addEventListener('test', function() {}, {
                    get passive() {
                        supportsPassive = true;
                        return true;
                    }
                });
                if ('ontouchstart' in document) {
                    var d = document, ts = this._touchstart.bind(this), tm = this._touchmove.bind(this), te = this._touchend.bind(this), opt = supportsPassive ? { passive: false, capture: false } : false;
                    d.addEventListener('touchstart', ts, opt);
                    d.addEventListener('touchmove', tm, opt);
                    d.addEventListener('touchend', te);
                    d.addEventListener('touchcancel', te);
                }
            }

            DragDropTouch.getInstance = function () {
                return DragDropTouch._instance;
            };
            DragDropTouch.prototype._touchstart = function (e) {
                var _this = this;
                if (this._shouldHandle(e)) {
                    if (Date.now() - this._lastClick < DragDropTouch._DBLCLICK) {
                        if (this._dispatchEvent(e, 'dblclick', e.target)) {
                            e.preventDefault();
                            this._reset();
                            return;
                        }
                    }
                    this._reset();
                    var src = this._closestDraggable(e.target);
                    if (src) {
                        if (!this._dispatchEvent(e, 'mousemove', e.target) &&
                            !this._dispatchEvent(e, 'mousedown', e.target)) {
                            this._dragSource = src;
                            this._ptDown = this._getPoint(e);
                            this._lastTouch = e;
                            e.preventDefault();
                            setTimeout(function () {
                                if (_this._dragSource == src && _this._img == null) {
                                    if (_this._dispatchEvent(e, 'contextmenu', src)) {
                                        _this._reset();
                                    }
                                }
                            }, DragDropTouch._CTXMENU);
                        }
                    }
                }
            };
            DragDropTouch.prototype._touchmove = function (e) {
                if (this._shouldHandle(e)) {
                    var target = this._getTarget(e);
                    if (this._dispatchEvent(e, 'mousemove', target)) {
                        this._lastTouch = e;
                        e.preventDefault();
                        return;
                    }
                    if (this._dragSource && !this._img) {
                        var delta = this._getDelta(e);
                        if (delta > DragDropTouch._THRESHOLD) {
                            this._dispatchEvent(e, 'dragstart', this._dragSource);
                            this._createImage(e);
                            this._dispatchEvent(e, 'dragenter', target);
                        }
                    }
                    if (this._img) {
                        this._lastTouch = e;
                        e.preventDefault(); 
                        if (target != this._lastTarget) {
                            this._dispatchEvent(this._lastTouch, 'dragleave', this._lastTarget);
                            this._dispatchEvent(e, 'dragenter', target);
                            this._lastTarget = target;
                        }
                        this._moveImage(e);
                        this._dispatchEvent(e, 'dragover', target);
                    }
                }
            };
            DragDropTouch.prototype._touchend = function (e) {
                if (this._shouldHandle(e)) {
                    if (this._dispatchEvent(this._lastTouch, 'mouseup', e.target)) {
                        e.preventDefault();
                        return;
                    }
                    if (!this._img) {
                        this._dragSource = null;
                        this._dispatchEvent(this._lastTouch, 'click', e.target);
                        this._lastClick = Date.now();
                    }
                    this._destroyImage();
                    if (this._dragSource) {
                        if (e.type.indexOf('cancel') < 0) {
                            this._dispatchEvent(this._lastTouch, 'drop', this._lastTarget);
                        }
                        this._dispatchEvent(this._lastTouch, 'dragend', this._dragSource);
                        this._reset();
                    }
                }
            };

            DragDropTouch.prototype._shouldHandle = function (e) {
                return e &&
                    !e.defaultPrevented &&
                    e.touches && e.touches.length < 2;
            };
            DragDropTouch.prototype._reset = function () {
                this._destroyImage();
                this._dragSource = null;
                this._lastTouch = null;
                this._lastTarget = null;
                this._ptDown = null;
                this._dataTransfer = new DataTransfer();
            };
            DragDropTouch.prototype._getPoint = function (e, page) {
                if (e && e.touches) {
                    e = e.touches[0];
                }
                return { x: page ? e.pageX : e.clientX, y: page ? e.pageY : e.clientY };
            };
            DragDropTouch.prototype._getDelta = function (e) {
                var p = this._getPoint(e);
                return Math.abs(p.x - this._ptDown.x) + Math.abs(p.y - this._ptDown.y);
            };
            DragDropTouch.prototype._getTarget = function (e) {
                var pt = this._getPoint(e), el = document.elementFromPoint(pt.x, pt.y);
                while (el && getComputedStyle(el).pointerEvents == 'none') {
                    el = el.parentElement;
                }
                return el;
            };
            DragDropTouch.prototype._createImage = function (e) {
                if (this._img) {
                    this._destroyImage();
                }
                var src = this._imgCustom || this._dragSource;
                this._img = src.cloneNode(true);
                this._copyStyle(src, this._img);
                this._img.style.top = this._img.style.left = '-9999px';
                if (!this._imgCustom) {
                    var rc = src.getBoundingClientRect(), pt = this._getPoint(e);
                    this._imgOffset = { x: pt.x - rc.left, y: pt.y - rc.top };
                    this._img.style.opacity = DragDropTouch._OPACITY.toString();
                }
                this._moveImage(e);
                document.body.appendChild(this._img);
            };
            DragDropTouch.prototype._destroyImage = function () {
                if (this._img && this._img.parentElement) {
                    this._img.parentElement.removeChild(this._img);
                }
                this._img = null;
                this._imgCustom = null;
            };
            DragDropTouch.prototype._moveImage = function (e) {
                var _this = this;
                if (this._img) {
                    requestAnimationFrame(function () {
                        var pt = _this._getPoint(e, true), s = _this._img.style;
                        s.position = 'absolute';
                        s.pointerEvents = 'none';
                        s.zIndex = '999999';
                        s.left = Math.round(pt.x - _this._imgOffset.x) + 'px';
                        s.top = Math.round(pt.y - _this._imgOffset.y) + 'px';
                    });
                }
            };
            DragDropTouch.prototype._copyProps = function (dst, src, props) {
                for (var i = 0; i < props.length; i++) {
                    var p = props[i];
                    dst[p] = src[p];
                }
            };
            DragDropTouch.prototype._copyStyle = function (src, dst) {
                DragDropTouch._rmvAtts.forEach(function (att) {
                    dst.removeAttribute(att);
                });
                if (src instanceof HTMLCanvasElement) {
                    var cSrc = src, cDst = dst;
                    cDst.width = cSrc.width;
                    cDst.height = cSrc.height;
                    cDst.getContext('2d').drawImage(cSrc, 0, 0);
                }
                var cs = getComputedStyle(src);
                for (var i = 0; i < cs.length; i++) {
                    var key = cs[i];
                    if (key.indexOf('transition') < 0) {
                        dst.style[key] = cs[key];
                    }
                }
                dst.style.pointerEvents = 'none';
                for (var i = 0; i < src.children.length; i++) {
                    this._copyStyle(src.children[i], dst.children[i]);
                }
            };
            DragDropTouch.prototype._dispatchEvent = function (e, type, target) {
                if (e && target) {
                    var evt = document.createEvent('Event'), t = e.touches ? e.touches[0] : e;
                    evt.initEvent(type, true, true);
                    evt.button = 0;
                    evt.which = evt.buttons = 1;
                    this._copyProps(evt, e, DragDropTouch._kbdProps);
                    this._copyProps(evt, t, DragDropTouch._ptProps);
                    evt.dataTransfer = this._dataTransfer;
                    target.dispatchEvent(evt);
                    return evt.defaultPrevented;
                }
                return false;
            };
            DragDropTouch.prototype._closestDraggable = function (e) {
                for (; e; e = e.parentElement) {
                    if (e.hasAttribute('draggable') && e.draggable) {
                        return e;
                    }
                }
                return null;
            };
            return DragDropTouch;
        }());
        DragDropTouch._instance = new DragDropTouch(); 
        DragDropTouch._THRESHOLD = 5; 
        DragDropTouch._OPACITY = 0.5;
        DragDropTouch._DBLCLICK = 500; 
        DragDropTouch._CTXMENU = 900;
        DragDropTouch._rmvAtts = 'id,class,style,draggable'.split(',');
        DragDropTouch._kbdProps = 'altKey,ctrlKey,metaKey,shiftKey'.split(',');
        DragDropTouch._ptProps = 'pageX,pageY,clientX,clientY,screenX,screenY'.split(',');
        DragDropTouch_1.DragDropTouch = DragDropTouch;
    })(DragDropTouch || (DragDropTouch = {}));
