/*
 * Carousel.js 3.1.0
 * Copyright ECLinkey Technology. All rights reserved
 * Author Hito(vip@hitoy.org) 
 *
 * JS异步执行轮播组件库，由杨海涛编写，所有权力保留
 * 使用方法：
 * 异步引用组件库，编写HTML和CSS，使HTML能在不适用JS条件下正常展示
 * 给轮播容器指定carousel-container属性
 * 给轮播滚动父元素指定carousel-scroll属性
 *
 *
 * 可选展示功能:
 * 为轮播容器添加一个子元素，并给予carousel-indicator属性
 * 即激活了轮播指示器功能，添加carousel-indicator-activeclass属性并赋值，即可指定焦点指示器类名
 * 为录播容器添加2个元素，并给与carousel-next-button或carousel-prev-button
 * 即激活了前后翻页功能
 * 注意: 为保持灵活性，基础样式请自行指定
 *
 * 其他可选展示样式
 * 为轮播容器添加不同属性，即可使用自定义功能
 * carousel-loop 无缝循环滚动
 * carousel-autoplay 自动滚动，可接方向end或start, end表示从索引小往索引大方向移动，start相反
 * carousel-delay 自动滚动间隔，单位毫秒，默认6000毫秒
 * carousel-duration 每次滚动时间，单位毫秒，默认600毫秒
 * carousel-step 每次滚动的个数，默认为窗口可见的完整对象个数
 * carousel-direction 滚动方向，x轴或y轴，默认x
 *
 * 为轮播carousel-scroll增加不同属性，可定义
 * carousel-slider-activeclass 可见的幻灯片class
 */
!function(w){
    'use strict';
    var version = '3.1.0';

    //轮播构造对象
    function Carousel(carouselscroll, duration, delay, loop, step, direction, mousewheel, indicator, nextbutton, previousbutton, carouselscrollactiveclass, activeclass){
        //阅读顺序是否从右到左
        var text_dir = '';

        //是否动画中
        var in_transition = false;

        //初始化首个幻灯片的边距
        var firstslideroffset;

        //总幻灯片个数，不包含过渡幻灯片
        var slidernum;

        //能够完整显示的幻灯片的数量
        var slidernuminview;

        //每次滑动的数量
        var step = step;

        //当前正在显示的幻灯片在滚动的子元素里的索引，包括过渡幻灯片
        var currentindex = 0;

        //carouselscroll的包裹元素
        var carouselwrap;

        //对象可视阈值
        var carouselthreshold = 0;

        //是否已经加载
        var loaded = false;


        /*
         * 判断对象书写方向
         */
        function is_rtl(){
            if(text_dir && text_dir == 'rtl')
                return true;
            else if(text_dir != '')
                return false;

            var el = carouselscroll;
            while(el){
                if(el == document || el.dir){
                    text_dir = el.dir;
                    break;
                }
                el = el.parentNode;
            }
            if(!text_dir)
                text_dir = 'ltr';
            return text_dir == 'rtl';
        }


        /*
         * 根据方向和索引获取相对于carouselwrap的偏移量
         * @param index int carouselscroll中子元素索引
         * @return Float
         */
        function getSliderDistance(index){
            var carousel = carouselscroll.children;
            if(index >= carousel.length || index < 0) return false;

            var rect = carousel[index].getBoundingClientRect();
            var wraprect = carouselwrap.getBoundingClientRect();
            var scrollrect = carouselscroll.getBoundingClientRect();
            if(direction == 'x'){
                if(is_rtl())
                    return wraprect.right - rect.right;
                return rect.left - wraprect.left;
            }else{
                return rect.top - wraprect.top;
            }
        }


        /*
         * 获取视野内可显示的完整幻灯片数量
         * @return int
         */
        function getSliderNumberinView(){
            var count = 0;
            var distance = direction == 'x' ? carouselscroll.getBoundingClientRect().width : carouselscroll.getBoundingClientRect().height;
            for(var i in Array.from(carouselscroll.children)){
                var slider = carouselscroll.children[i];
                var sliderdistance = direction == 'x' ? slider.getBoundingClientRect().width : slider.getBoundingClientRect().height;

                var offset = getSliderDistance(i);
                if(offset >= 0 &&  offset + sliderdistance <= distance){
                    count++;
                }else if(offset >= distance){
                    break;
                }
            }
            return count;
        }


        /*
         * 显示指示器，对正在显示的高亮显示
         * @param index int 当前查看的幻灯片索引(包含过渡幻灯片)
         * @return null
         */
        function activateIndicator(index){
            var indicators = indicator.querySelectorAll('span');
            if(loop){
                index = index - step;
            }
            indicator.querySelectorAll('span').forEach(function(c,i){
                if(i >= index && i < index + step){
                    c.classList.add(activeclass);
                }else{
                    c.classList.remove(activeclass);
                }
            });
        }


        /*
         * 根据参数激活前或后翻页按钮
         * @param button string next|previous按钮
         */
        function enablePageButton(button){
            if(nextbutton && button == nextbutton){
                nextbutton.setAttribute('aria-disabled', 'false');
            }
            else if(previousbutton && button == previousbutton){
                previousbutton.setAttribute('aria-disabled', 'false');
            }
        }


        /*
         * 根据参数冻结前或后翻页按钮
         * @param button string next|previous按钮
         */
        function disablePageButton(button){
            if(nextbutton && button == nextbutton){
                nextbutton.setAttribute('aria-disabled', 'true');
            }
            else if(previousbutton && button == previousbutton){
                previousbutton.setAttribute('aria-disabled', 'true');
            }
        }


        /*
         * 根据索引和时间移动carouselscroll
         * @param index int carouselscroll中子元素索引
         * @param duration int 移动时间 毫秒
         * @param direction string 方向，可选，默认为x
         * 把carouselscroll移动到指定的位置
         */
        function move(index, duration){
            if(index < 0 || index >= carouselscroll.children.length) return false;
            var offset = getSliderDistance(index);
            if(is_rtl())
                var transdis = parseFloat(carouselscroll.getAttribute('data-translate')) + offset;
            else
                var transdis = parseFloat(carouselscroll.getAttribute('data-translate')) - offset;
            carouselscroll.style.transitionDuration = parseFloat(duration/1000) + 's';
            carouselscroll.style.transitionDelay = '0s';

            if(direction == 'x'){
                carouselscroll.style.transform = 'translate3d(' + transdis + 'px,0,0)';
            }else{
                carouselscroll.style.transform = 'translate3d(0,' + transdis + 'px,0)';
            }
            carouselscroll.setAttribute('data-translate', transdis);
        }


        /*
         * 滑动动画核心方法
         * @param index 幻灯片相对carouselscroll的索引
         * 同时实现无缝循环和不循环两种效果
         * 增加10ms延迟，防止transitionDuration时间和setTimeout时间的差异
         */
        function slide(index){

            //一次只能运行一个动画
            if(in_transition) return false;

            //设置动画状态
            in_transition = true;

            //以动画方式移动元素
            move(index, duration);

            //动画结束之后设置状态
            setTimeout(function(){
                //立即跳转到合适的位置以实现无缝滚动效果
                if(loop){
                    //如果当前索引在头部过渡幻灯片上，则跳转到尾部
                    if(index < step){
                        index = index + slidernum;
                        move(index, 0);
                    }
                    //如果当前索引在尾部过渡幻灯片，则跳转到头部
                    else if(index >= slidernum + step){
                        index = index - slidernum;
                        move(index, 0);
                    }
                }

                //更改当前幻灯片索引状态
                currentindex = index;

                //给正在展示的幻灯片配置属性
                var order = 1;
                carouselscroll.childNodes.forEach(function(c, i){
                    if(i >= index && i < index + slidernuminview){
                        c.classList.add(carouselscrollactiveclass);
                        c.setAttribute('data-visible-index', order);
                        order++;
                    }else{
                        c.classList.remove(carouselscrollactiveclass);
                        c.removeAttribute('data-visible-index');
                    }
                });

                //设置指示器状态
                if(indicator) activateIndicator(index);

                //设置翻页状态
                enablePageButton(nextbutton);
                enablePageButton(previousbutton);
                if(!loop && currentindex >= slidernum - slidernuminview){
                    disablePageButton(nextbutton);
                }
                else if(!loop && currentindex == 0){
                    disablePageButton(previousbutton);
                }

                //动画状态为false
                in_transition = false; 
            }, duration + 10);
        }


         /*
         * 移动端拖拽移动事件
         */
        function attachDragHandle(){
             /*
             * 拖拽功能
             * 需要几组变量存放数据以获得拖拽距离
             * initpageX,initpageY存放touchstart时的位置
             * pageX,pageY存放touchmove时的位置
             */
            var initpageX = 0;
            var initpageY = 0;
            var pageX = 0;
            var pageY = 0;
            var freeze = false;

            //绑定拖拽事件
            carouselscroll.addEventListener('touchstart', function(ev){
                initpageX = ev.targetTouches[0].pageX;
                initpageY = ev.targetTouches[0].pageY;
                pageX = initpageX;
                pageY = initpageY;
            }, {passive: true});
            carouselscroll.addEventListener('touchmove', function(ev){
                var x = ev.targetTouches[0].pageX;
                var y = ev.targetTouches[0].pageY;
                var translate = parseFloat(carouselscroll.getAttribute('data-translate'));
                carouselscroll.style.transitionDuration = '0s';
                carouselscroll.style.transitionDelay  = '0s';


                var movedisx = Math.abs(x - initpageX);
                var movedisy = Math.abs(y - initpageY);

                //第一次移动的方向，来判断滚动是否冻结，冻结的情况下无法移动元素
                if((direction == 'x' && movedisx < movedisy) || (direction == 'y' &&  movedisx > movedisy)){
                    freeze = true;
                }

                if(direction == 'x' && !freeze){
                    var movedis = x - pageX;
                    var transdis = translate + movedis;
                    carouselscroll.style.transform = 'translateX('+transdis+'px)';
                    carouselscroll.setAttribute('data-translate', transdis);
                    ev.stopPropagation();
                    ev.preventDefault();
                }else if(direction == 'y' && !freeze){
                    var movedis = y - pageY;
                    var transdis = translate + movedis;
                    carouselscroll.style.transform = 'translateY('+transdis+'px)';
                    carouselscroll.setAttribute('data-translate', transdis);
                    ev.stopPropagation();
                    ev.preventDefault();
                }
                pageX = x;
                pageY = y;
            }, {passive: false});
            carouselscroll.addEventListener('touchend', function(ev){
                var x = ev.changedTouches[0].pageX;
                var y = ev.changedTouches[0].pageY;
                var next = currentindex;

                if(direction == 'x'){
                    var movedis = x - initpageX;
                }else{
                    var movedis = y - initpageY;
                }

                if( ( is_rtl() && movedis > 0 ) || (!is_rtl() && movedis < 0) ){
                    for(var i = next; i < carouselscroll.children.length; i++){
                        if(getSliderDistance(i) > 0){
                            if(Math.abs(getSliderDistance(i - 1)) * 3 > carouselscroll.children[i - 1].offsetWidth){
                                next = i;
                            }
                            break;
                        }
                    }
                }else if( ( is_rtl() && movedis < 0 ) || (!is_rtl() && movedis > 0)){
                    for(var i = next; i >= 0; i--){
                        if(getSliderDistance(i) < 0 && (carouselscroll.children[i].offsetWidth + getSliderDistance(i)) * 3 > carouselscroll.children[i].offsetWidth){
                                next = i;
                            break;
                        }
                    }
                }


                //非loop下，必须保证最后没有空白
                if(!loop && next > slidernum - slidernuminview) next = slidernum - slidernuminview;

                slide(next);
                freeze = false;
            }, {passive: true});
        }


        //鼠标滚轮事件
        function attachWheelHandle(){
            var starttime = 0;
            var endtime = 0;
            carouselwrap.addEventListener('wheel', function(ev){
                starttime = new Date().getTime();
                if(ev.deltaY > 0 && starttime - endtime > duration){
                    if(!loop && currentindex == slidernum - step || carouselthreshold < 0.75) return false;
                    slide(currentindex + step);
                    setTimeout(function(){
                        endtime = new Date().getTime();
                    }, duration);
                }else if(ev.deltaY < 0 && starttime - endtime > duration){
                    if(!loop && currentindex == 0 || carouselthreshold < 0.75) return false;
                    slide(currentindex - step);
                    setTimeout(function(){
                        endtime = new Date().getTime();
                    }, duration);
                }
                ev.preventDefault();
            }, {passive: false});
        }


        /*
         * 初始化数据
         * 此函数在onload之后或resize时执行
         * 用于初始化并生成相关数据，是系统的入口函数
         */
        function __init(){
            //初始化翻页按钮默认为禁用状态
            disablePageButton(nextbutton);
            disablePageButton(previousbutton);

            //删除滚动列表的非元素节点
            var nodes = carouselscroll.childNodes;
            for(var i = nodes.length-1; i>=0; i--){
                if(nodes[i].nodeType !== 1){
                    carouselscroll.removeChild(nodes[i]);
                }
            }

            //给滚动列表嵌套一层父元素，初始化其属性，删除子元素margin
            var carouselscrollrect = carouselscroll.getBoundingClientRect();
            var carouselscrollstyle = w.getComputedStyle(carouselscroll);
            carouselwrap = document.createElement('div');
            carouselwrap.style.width =  carouselscrollrect.width + 'px';
            carouselwrap.style.height =  carouselscrollrect.height + 'px';
            carouselwrap.className = 'carousel-wrap';
            carouselwrap.setAttribute('carousel-wrap', '');
            carouselwrap.style.margin = carouselscrollstyle.getPropertyValue('margin');
            carouselscroll.style.margin = 0;
            carouselscroll.parentNode.insertBefore(carouselwrap, carouselscroll);
            carouselwrap.appendChild(carouselscroll);

            //获取第一个幻灯片的位移值
            firstslideroffset = getSliderDistance(0); 

            //保存原始幻灯片个数
            slidernum = carouselscroll.children.length;

            //获取视野中显示的完整幻灯片个数
            slidernuminview = getSliderNumberinView();

            //scroll容器必须被填满，否则不应有滑动功能
            if(slidernum == 0 || slidernum == slidernuminview){
                return false;
            }

             //计算每次滑动的元素个数
            if(step == 'auto'){
                step = slidernuminview;
            }else{
                step = Math.min(step, slidernuminview);
            }

            //激活下一页按钮
            enablePageButton(nextbutton);

            //默认状态下容器偏移量为0
            carouselscroll.setAttribute('data-translate', 0);

            /*
             * 当需要进行LOOP时，则需要动态向前后插入幻灯片
             * 为了保证无缝滚动，需要往前后插入视野中能够显示幻灯片的数量
             * 系统只支持左对齐，所以需要往头部插入step个过渡幻灯片，往尾部插入slidernuminview个幻灯片
             */
            if(loop){
                var origin_sliders = carouselscroll.children;

                //先往尾部需要插入的元素，插入个数为可见幻灯片个数
                for(var i = 0; i < slidernuminview; i++){
                    var clone = origin_sliders[i].cloneNode(true);
                    carouselscroll.appendChild(clone);
                }
                //再往头部插入的元素，插入个数为一次移动的个数
                for(var i = slidernum - 1; i >= slidernum - step; i--){
                    var slider = origin_sliders[i];
                    var clone = slider.cloneNode(true);
                    carouselscroll.insertBefore(clone, carouselscroll.children[0]);
                }

                //设置看到默认为第一个幻灯片
                var positionoffset = getSliderDistance(step) - firstslideroffset;
                if(direction == 'x'){
                    if(is_rtl())
                        carouselscroll.style.right = - positionoffset + 'px';
                    else
                        carouselscroll.style.left =  - positionoffset + 'px';
                }else{
                    carouselscroll.style.top = - positionoffset + 'px';
                }
                currentindex = step;

                //上一页按钮可点击
                enablePageButton(previousbutton);
            }
            else{
                //上一页按钮不可见
                disablePageButton(previousbutton);
            }

            //1. 先给所有幻灯片设置宽度和高，并给视野中完整的幻灯片设置class
            var start = loop ? step : 0;
            var end = loop ? slidernuminview + step : slidernuminview;
            var index = 1;
            carouselscroll.childNodes.forEach(function(node, i){
                var rect = node.getBoundingClientRect();
                node.style.width = rect.width + 'px';
                node.style.height = rect.height + 'px';
                if(i >= start && i < end){
                    node.classList.add(carouselscrollactiveclass);
                    node.setAttribute('data-visible-index', index);
                    index++;
                }
            });

            //2. 计算整个滚动容器的尺寸
            var lastsliderrect = carouselscroll.lastElementChild.getBoundingClientRect();
            var carouselscrollrect = carouselscroll.getBoundingClientRect();
            if(direction == 'x'){
                if(is_rtl())
                    carouselscroll.style.width = carouselscrollrect.right - lastsliderrect.left + 'px';
                else
                    carouselscroll.style.width = lastsliderrect.right - carouselscrollrect.left + 'px';
                carouselscroll.style.height = carouselscrollrect.height + 'px';
            }else{
                carouselscroll.style.width = carouselscrollrect.width + 'px';
                carouselscroll.style.height = lastsliderrect.bottom - carouselscrollrect.top + 'px';
            }

            //3. 根据需求创建指示器，并监听其点击
            if(indicator){
                indicator.innerHTML='<span></span>'.repeat(slidernum);
                activateIndicator(currentindex);
                indicator.addEventListener('click', function(e){
                    var target = e.target || w.event.srcElement;
                    if(target.closest('span')){
                        var index = (Array.from(indicator.children).indexOf(target.closest('span')));
                        //非loop下，必须保证最后没有留有空白
                        if(!loop && index > slidernum - slidernuminview) index = slidernum - slidernuminview;
                        //loop下，则需要跳过前面添加的过渡幻灯片
                        else if(loop) index = index + step;

                        slide(index);
                    }
                });
            }


            //4. 监听上一页和下一页按钮的点击
            //绑定下一页和上一页点击事件
            if(nextbutton){
                //下一页按钮默认冻结
                nextbutton.addEventListener('click', function(e){
                    if(nextbutton.getAttribute('aria-disabled') == 'true') return false;
                    var next = currentindex + step;
                    //非loop下，必须保证最后没有留有空白
                    if(!loop && next > slidernum - slidernuminview && next < slidernum) next = slidernum - slidernuminview;
                    //非loop下，保证能跳转到头部
                    else if(!loop && next == slidernum) next = 0;

                    slide(next);
                });
            }
            if(previousbutton){
                //上一页按钮默认冻结
                previousbutton.addEventListener('click', function(e){
                    if(previousbutton.getAttribute('aria-disabled') == 'true') return false;
                    var next = currentindex - step;
                    //非loop下，必须保证第一个幻灯片必须显示
                    if(!loop && next < 0 && next > - step)  next = 0;
                    //非loop下，必须保证能跳转到尾部
                    else if(!loop && next == - step)  next = slidernum - slidernuminview;

                    slide(next);
                });
            }

            //5. 附加拖拽事件
            attachDragHandle();

            //6. 鼠标滚动控制
            if(mousewheel)
                attachWheelHandle();

            loaded = true;
        };

        //初始化
        __init();


        /*
         * 重新渲染，通常发生在页面大小发生变化时
         */
        this.Rerender = function(){
            if(!loaded) return false;

            //清除carouselwrap的原有尺寸
            carouselwrap.style.width = '';
            carouselwrap.style.height = '';

            //清除carouselscroll及其子元素的原有尺寸
            carouselscroll.style.width = '';
            carouselscroll.style.height = '';
            carouselscroll.childNodes.forEach(function(node, i){
                node.style.width = '';
                node.style.height = '';
             });

            //添加carouselwrap的尺寸
            var carouselscrollrect = carouselscroll.getBoundingClientRect();
            carouselwrap.style.width =  carouselscrollrect.width + 'px';
            carouselwrap.style.height =  carouselscrollrect.height + 'px';

            //添加carouselscroll及其子元素的尺寸
            carouselscroll.childNodes.forEach(function(node, i){
                var rect = node.getBoundingClientRect();
                node.style.width = rect.width + 'px';
                node.style.height = rect.height + 'px';
            });
            var lastsliderrect = carouselscroll.lastElementChild.getBoundingClientRect();
            var carouselscrollrect = carouselscroll.getBoundingClientRect();
            if(direction == 'x'){
                if(is_rtl())
                    carouselscroll.style.width = carouselscrollrect.right - lastsliderrect.left + 'px';
                else
                    carouselscroll.style.width = lastsliderrect.right - carouselscrollrect.left + 'px';
                carouselscroll.style.height = carouselscrollrect.height + 'px';
            }else{
                carouselscroll.style.width = carouselscrollrect.width + 'px';
                carouselscroll.style.height = lastsliderrect.bottom - carouselscrollrect.top + 'px';
            }
        }

        /*
         * 自动播放轮播动画
         * orientation 为start或者end, end表示往索引大的方向移动，start相反
         * 对外暴漏
         */
        this.play = function(orientation){
            var autoplayid, playing = false;
            if(slidernum == 0 || slidernum == slidernuminview) return false;

            var start = function(){
                if(!playing && carouselthreshold > 0.25){
                    playing = true;
                    autoplayid = setTimeout(function(){
                        var next = 0;
                        if(orientation == 'end'){
                            next = currentindex + step;
                            //非loop下，必须保证最后没有留有空白
                            if(!loop && next > slidernum - slidernuminview && next < slidernum) next = slidernum - slidernuminview;
                            //非loop下，保证能跳转到头部
                            else if(!loop && next == slidernum) next = 0;
                        }else if(orientation == 'start'){
                            next = currentindex - step;
                            //非loop下，必须保证第一个幻灯片必须显示
                            if(!loop && next < 0 && next > - step)  next = 0;
                            //非loop下，必须保证能跳转到尾部
                            else if(!loop && next == - step)  next = slidernum - slidernuminview;
                        }
                        slide(next);
                        playing = false;
                        start();
                    }, delay);
                }
            };

            var stop = function(){
                playing = false;
                clearTimeout(autoplayid);
            };

            //附加鼠标移入和touchstart暂停事件
            ['mouseenter','touchstart'].forEach(function(ev){
                carouselwrap.parentNode.addEventListener(ev, function(){
                    stop();
                });
            }, {passive: true});
            //附加鼠标移出和touchend播放事件
            ['mouseleave','touchend'].forEach(function(ev){
                carouselwrap.parentNode.addEventListener(ev, function(){
                    start();
                });
            }, {passive: true});
            //窗口非激活状态停止播放
            document.addEventListener('visibilitychange', function(){
                if(document.visibilityState == 'visible') start();
                else if(document.visibilityState == 'hidden') stop();
            });
            //开始播放
            start();
        }

        //设置对象可视阈值
        this.setThreshold = function(threshold){
            carouselthreshold = threshold;
        }

        //对外暴漏接口
        this.carouselwrap = carouselwrap;
        this.carouselwrap.guid = Math.random().toString(36).substr(2);
    }

    //解析DOM，开始工作
    function parseCarousel(){

        //页面中所有的轮播对象
        var carousels = {};

        //观察轮播器在视口中的变化，以控制播放逻辑
        if(w.IntersectionObserver){
            var carouselwrapobserver = new IntersectionObserver(function(entries){
                entries.forEach(function(entry){
                    var id = entry.target.guid;
                    var carousel = carousels[id];
                    carousel.setThreshold(entry.intersectionRatio);
                });
            }, {
                rootMargin: '0px',
                threshold: [0, 0.25, 0.5, 0.75, 1]
            });
        }
        //当窗口大小发生变化时，重新渲染
        window.addEventListener('resize', function(){
            for(var index in carousels){
                if(carousels[index])
                    carousels[index].Rerender();
            }
        });

        //查询页面中所有的轮播要求，并解析
        var items = w.document.querySelectorAll('[carousel-container]');

        items.forEach(function(el){
            //是否循环滚动
            var loop = el.hasAttribute('carousel-loop');
            //是否自动滚动，和滚动的方向
            var autoplay = el.hasAttribute('carousel-autoplay') ? (el.getAttribute('carousel-autoplay') ? el.getAttribute('carousel-autoplay') : 'end') : false;

            //每次滑动延迟时间
            var delay = el.hasAttribute('carousel-delay') ? parseInt(el.getAttribute('carousel-delay')) : 6000;
            //每次动画持续时间
            var duration = el.hasAttribute('carousel-duration') ? parseInt(el.getAttribute('carousel-duration')): 600;
            //每次滑动的子元素个数，默认为视野内的所有子元素
            var step = el.hasAttribute('carousel-step') ? parseInt(el.getAttribute('carousel-step')) : 'auto';
            //滑动的方向x轴或者y轴
            var direction = el.hasAttribute('carousel-direction') ? ['x','y'].indexOf(el.getAttribute('carousel-direction')) == -1 ? 'x' : el.getAttribute('carousel-direction') : 'x';
            //是否通过鼠标控制滚动
            var mousewheel = el.hasAttribute('carousel-mousewheel');

            //滚动元素的父元素
            var carouselscroll = el.querySelector('[carousel-scroll]');
            if(!carouselscroll) return;

            //可见幻灯片的属性
            var carouselscrollactiveclass =  carouselscroll.getAttribute('carousel-slider-activeclass') || 'carousel-visible-slider';

            //初始化classname
            el.classList.add('carousel-container');
            carouselscroll.classList.add('carousel-scroll');
            if(direction == 'x'){
                carouselscroll.classList.add('carousel-scroll-x');
            }else{
                carouselscroll.classList.add('carousel-scroll-y');
            }

            //指示图标
            var indicator = el.querySelector('[carousel-indicator]') 
            var activeclass = indicator ? indicator.getAttribute('carousel-indicator-activeclass') || 'carousel-active-indicator' : 'carousel-active-indicator';

            //切换按钮
            var nextbutton = el.querySelector('[carousel-next-button]');
            if(nextbutton){
                nextbutton.setAttribute('role', 'button');
                nextbutton.setAttribute('tabindex', '0');
            }
            var previousbutton = el.querySelector('[carousel-prev-button]');
            if(previousbutton){
                previousbutton.setAttribute('role', 'button');
                previousbutton.setAttribute('tabindex', '0');
            }

            //初始化轮播对象
            var carousel =  new Carousel(carouselscroll, duration, delay, loop, step, direction, mousewheel, indicator, nextbutton, previousbutton, carouselscrollactiveclass, activeclass);
            if(autoplay) carousel.play(autoplay);

            //观察所有轮播对象DOM包裹器
            if(carouselwrapobserver && carousel.carouselwrap){
                carouselwrapobserver.observe(carousel.carouselwrap);
                carousels[carousel.carouselwrap.guid] = carousel;
            }
        });
    }


    //创建全局样式
    function attachCarouselStyle(){
        var nestedstyle = w.document.createElement('style');
        nestedstyle.setAttribute('runtime-style', 'carouseljs-' + version);
        nestedstyle.innerHTML=`
        [carousel-container] {
            position: relative;
        }
        [carousel-wrap] {
            position: relative;
            max-width: 100%;
            max-height: 100%;
            overflow: hidden;
        }
        [carousel-scroll] {
            position: absolute;
            display: block;
            width: 100%;
            height: auto;
            transition-property: transform;
            transition-timing-function: ease-in-out;
            will-change: transform;
            backface-visibility: hidden;
        }
        [carousel-scroll] > * {
            box-sizing: border-box;
            backface-visibility: hidden;
        }
        [carousel-scroll].carousel-scroll-x {
            white-space:nowrap;
        }
        [carousel-scroll].carousel-scroll-x > * {
            display: inline-block;
            vertical-align: top;
            white-space: initial;
        }
        [carousel-scroll].carousel-scroll-y > * {
            display: block;
        }
        [carousel-prev-button][aria-disabled = true],[carousel-next-button][aria-disabled = true] {
            visibility: hidden;
        }`;
        w.document.head.append(nestedstyle);
    }
    

    //第一次加载时执行初始化函数
    var readyState = w.document.readyState;
    if(readyState == "complete"){
        attachCarouselStyle();
        parseCarousel();
    }else{
        w.addEventListener("load", function(){
            attachCarouselStyle();
            parseCarousel();
        });
    }
}(window);
