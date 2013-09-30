/**
 * Обертка для отправки JSONP запросов
 * @param request String - URL запроса
 * @param callback Function - обработчик ответа
 * @param params Object - дополнительные параметры запроса
 */
function callJsonpApi(request, callback, params) {
    var url = "http://api.printclick.ru" + request + "&callback=?";
    $.getJSON(url, params ? params : {}, callback);
}

var DemoViewModel = function() {
        var self = this;
        /**
         * Домен на котором работает сайт, куда должны идти ответы от конструктора
         */
        self.webDomain = "http://demo.printclick.ru";
        self.constructorCss = self.webDomain + "/css/constructor.css?ver=5";
        self.partnerRef = 1753;
        /**
         * Блок работы с каталогом продуктов
         */
        // Список категорий продуктов
        self.menu = ko.observableArray(null);
        // Выбранная категория
        self.menuItem = ko.observable(null);
        // Идентификатор выбранной категории продуктов
        self.workCategory = ko.observable(0);
        // Тиражи и стоимость для выбранной категории
        self.costs = ko.observableArray(null);
        // размер страницы каталога
        self.pagesize = ko.observable(0);
        // Текущая страница
        self.page = ko.observable(1);
        // Массив со страницами
        self.pages = ko.observableArray(null);
        // Поисковая строка
        self.searchText = ko.observable("");
        // Найденные макеты
        self.makets = ko.observableArray(null);
        // Найденное количество макетов
        self.totalMakets = ko.observable(0);
        // Информация о созданном макете пользователя
        self.generatedMaket = ko.observable(null);
        /**
         * Блок работы с тэгами. Из доступных выбираются цвета и сферы деятельности
         */
        self.tags = ko.observableArray(null);
        self.tag = ko.observable(0);
        self.colorTags = ko.observableArray(null);
        self.selectedTag = ko.observable(null);
        self.selectedColorTag = ko.observable(null);
        // Подсказка для выпадашки с цветом
        self.selectedColor = ko.computed(function() {
            return self.selectedColorTag() ? self.selectedColorTag().name : "Выбрать цвет макета";
        });
        /**
         * Сопуствующие товары
         */
        self.products = ko.observableArray(null);
        /**
         * Блок работы с доставкой
         */
        // Город доставки
        self.cityName = ko.observable("");
        // Хранилище вариантов доставки
        self.deliveries = ko.observableArray(null);
        // Выбранныей способ доставки
        self.selectedDelivery = ko.observable(null);
        // Вырианты областей, если неудается однозначно определить город
        self.areaVariants = ko.observableArray(null);
        // Выбранная область
        self.selectedArea = ko.observable(null);
        // Стоимость доставки
        self.deliveryCost = ko.observable(0);
        // Автоматическое определение стоимость доставки, при выборе способа доставки
        self.selectDelivery = ko.computed(function() {
            var delivery = self.selectedDelivery();
            if (delivery) {
                self.deliveryCost(delivery.cost);
            } else {
                self.deliveryCost(0);
            }
        });
        /**
         * Блок работы с контактами
         */
        // Сообщения об ошибках
        self.contactsError = ko.observable("");

        /**
         * Корзина
         */
        self.batch = ko.observableArray(null);
        // Вычисление стоимости товаров в корзине
        self.batchCost = ko.computed(function() {
            var out = 0;
            var products = self.batch();
            if (products) {
                for (var i = 0; i < products.length; i++) {
                    out += parseInt(products[i].buyCost());
                }
            }
            return out;
        });
        // Номер заказа пользователя
        self.lastOrderId = ko.observable(0);

        // Суммируем доставку и корзину
        self.totalOrderPrice = ko.computed(function() {
            return (parseInt(self.batchCost()) + parseInt(self.deliveryCost())).toString().replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
        });

        // Выбираем категории тэгов для каталога, исключая выбранную категорию
        self.allTags = ko.computed(function() {
            var out = new Array();
            var tags = self.tags();
            var selected = self.selectedTag();
            if (tags) {
                var checkName = selected ? selected.group_name : "";
                for (var i = 0; i < tags.length; i++) {
                    if (tags[i].group_name != checkName) {
                        out.push(tags[i]);
                    }
                }
            }
            return out;
        });

        // Заранее подготавливаем продукты которые хотим продавать.
        // Полный список продуктов доступен в методе API : get_categories (http://www.printclick.ru/api-docs.html#get_categories)
        var selectedProducts = [{
            alias: "business-cards",
            name: "Визитки",
            pageSize: 15
        }, {
            alias: "lists",
            name: "Листовки",
            heigth: 1250,
            pageSize: 9
        }, {
            alias: "notebooks",
            name: "Блокноты",
            heigth: 1250,
            pageSize: 9
        }, {
            alias: "parties",
            name: "Открытки",
            heigth: 1250,
            pageSize: 12
        }, {
            alias: "pocket",
            name: "Календари",
            pageSize: 12
        }, {
            alias: "folder",
            name: "Папки",
            pageSize: 12
        }, {
            alias: "fblank",
            name: "Бланки",
            heigth: 1250,
            pageSize: 9
        }]

        /**
         * Обработчики изменений
         */
        // Смена категории продуктов
        self.showCatalog = function(obj) {
                self.menuItem(obj);
                self.costs(null);
                self.makets(null);
                self.pages(null);
                self.page(1);
                self.tag(0);
                self.selectedColorTag(null);
                self.searchText("");

                self.workCategory(obj.id);
                self.pagesize(obj.pageSize);
                self.loadCosts();
                self.loadTags();
            }
            // Переход на страницу каталога
            self.showPage = function(obj) {
                if (parseInt(obj.num) > 0 && obj.num != self.page()) {
                    self.makets(null);
                    self.page(obj.num);
                    self.loadMakets();
                }
            }
            // Выбрать макеты по тэгу
            self.showTagCategory = function(obj) {
                self.searchText("");
                self.tag(0);
                self.selectedColorTag(null);
                self.selectedTag(obj);
                self.page(1);
                self.loadMakets();
            }
        self.showTag = function(obj) {
            self.searchText("");
            self.makets(null);
            self.selectedColorTag(null);
            self.page(1);
            self.tag(obj.id);
            self.loadMakets();
        }
        // Поиск макетов по фразе
        self.searchMakets = function() {
            self.tag(0);
            self.selectedColorTag(null);
            self.selectedTag(null);
            self.page(1);
            self.loadMakets();
        }
        // Выбор макетов по цветовому тэгу
        self.selectColor = function(obj) {
            self.searchText("");
            self.tag(0);
            self.selectedTag(null);
            self.selectedColorTag(obj);
            self.page(1);
            self.loadMakets();
        }

        self.loadCosts = function() {
            callJsonpApi("/get_cost/jsonp/?category=" + self.workCategory(), function(data) {
                if (data && data.status) {
                    self.costs(data.data);
                }
            });
        }

        self.showOrderForm = function() {
            $('.cart-popup').hide();
            if (self.selectedDelivery()) {
                $(".body-over").show();
                $("#orderPopup").show();
            } else {
                $(document.body).animate({
                    'scrollTop': $('#topPanelDiv').offset().top
                }, 100);
                $('.top-panel__city-select-hint').show().animate({
                    fontSize: "20px"
                }, 500).animate({
                    fontSize: "16px"
                }, 500).animate({
                    fontSize: "20px"
                }, 500).animate({
                    fontSize: "16px"
                }, 500);
            }
        }

        self.loadTags = function() {
            self.tag(0);
            self.selectedColorTag(null);
            self.tags(null);
            self.colorTags(null);
            self.selectedTag(null);
            callJsonpApi("/get_tags/jsonp?category=" + self.workCategory(), function(data) {
                if (data && data.status && data.status == 200) {
                    for (var i = 0; i < data.data.length; i++) {
                        if (data.data[i].group_name == "Тэги - Цвета") {
                            self.colorTags(data.data[i].tags[0].tags);
                        } else if (data.data[i].group_name == "Тэги - Сфера деятельности") {
                            self.tags(data.data[i].tags);
                            self.selectedTag(data.data[i].tags[0]);
                        }
                    }
                }
                self.loadMakets();
            });
        }

        self.loadMakets = function() {
            var url = "/get_catalog/jsonp?category=" + self.workCategory() + "&page=" + self.page() + "&pagesize=" + self.pagesize();
            if (self.searchText().length) {
                url += "&search=" + self.searchText();
            } else {
                if (self.tag() > 0) {
                    url += "&tags=" + self.tag();
                    if (self.selectedColorTag()) {
                        url += "," + self.selectedColorTag().id;
                    }
                } else if (self.selectedTag()) {
                    var workTags = self.selectedTag().tags;
                    var tags = "0";
                    for (var i = 0; i < workTags.length; i++) {
                        tags += "," + workTags[i].id;
                    }
                    url += "&tags=" + tags;
                    if (self.selectedColorTag()) {
                        url += "," + self.selectedColorTag().id;
                    }
                } else if (self.selectedColorTag()) {
                    url += "&tags=" + self.selectedColorTag().id;
                }
            }

            callJsonpApi(url, function(data) {
                if (data && data.status) {
                    self.totalMakets(data.data.total);
                    self.countPage(data.data.total);
                    self.makets(data.data.items);
                }
            });
        }

        self.getDeliveryCost = function() {
            self.deliveries(null);
            self.selectedDelivery(null);
            self.areaVariants(null);
            self.selectedArea(null);
            self.deliveryCost(0);
            var city = self.cityName();
            if (city.length) {
                callJsonpApi("/get_delivery/jsonp?city=" + city, function(data) {
                    if (data && data.data && data.data.need_selection) {
                        self.areaVariants(data.data.need_selection);
                    } else if (data && data.data) {
                        self.deliveries(data.data);
                        if (data.data.length == 1) {
                            self.selectedDelivery(data.data[0]);
                        }
                    }
                });
            } else {
                alert("Введите название города");
            }
        }
        self.getDeliveryAreaCost = function() {
            self.deliveries(null);
            self.selectedDelivery(null);
            self.deliveryCost(0);
            var city = self.cityName();
            var addCityId = self.selectedArea() ? "&city_id=" + self.selectedArea().city_id : "";
            if (city.length) {
                callJsonpApi("/get_delivery/jsonp?city=" + city + addCityId, function(data) {
                    if (data && data.data) {
                        self.deliveries(data.data);
                        if (data.data.length == 1) {
                            self.selectedDelivery(data.data[0]);
                        }
                    }
                });
            } else {
                alert("Введите название города");
            }
        }

        /**
         * Загрузка конструктора в IFrame
         * При формировании URL конструктору нужно передать:
         *      ID шаблона, который показывать
         *      URL вашего сайта
         *      CSS для кастомизации конструктора (опционально)
         */
        self.loadConstMaket = function(obj) {
            self.generatedMaket(null);
            // Изменяем размер высоту IFrame в зависимости от типа продукта
            var frameHeigth = 750;
            for (var i = 0; i < selectedProducts.length; i++) {
                if (selectedProducts[i].id == self.workCategory() && selectedProducts[i].heigth) {
                    frameHeigth = selectedProducts[i].heigth;
                    break;
                }
            }
            $(".constructor-content").height(frameHeigth);
            $("#constrctrFrame").height(frameHeigth);
            // Грузим конструктор
            var url = "http://www.printclick.ru/api-constructor.html?id=" + obj.id + "&callback=" + self.webDomain + "&css=" + self.constructorCss;
            $("#constrctrFrame").attr("src", url);
            $(".body-over").show();
            $('#constructorPopup').show();
            $(".constructor-content").show();
        }

        self.setGeneratedMaket = function(obj) {
            obj.cost = self.costs();
            obj.buyCount = ko.observable(obj.cost[1]);
            obj.buyCost = ko.computed(function() {
                var bc = this.buyCount();
                return bc ? bc.cost : 0;
            }, obj);
            for (var i = 0; i < selectedProducts.length; i++) {
                if (selectedProducts[i].id == self.workCategory()) {
                    obj.name = selectedProducts[i].name;
                }
            }
            obj.maket = true;
            obj.preview = obj.previews[0];
            self.generatedMaket(obj);
            $(".constructor-content").hide();
        }

        self.countPage = function(total) {
            var maxPages = 2;
            var t = Math.ceil(total / self.pagesize());
            var pages = new Array();
            var p = self.page();
            if (t < 12) {
                for (var i = 0; i < t; i++) {
                    pages.push({
                        num: i + 1
                    });
                }
            } else {
                if (p <= 2 * maxPages + 1) {
                    for (var i = 1; i < p + maxPages; i++) {
                        pages.push({
                            num: i
                        });
                    }
                    pages.push({
                        num: "..."
                    });
                    for (var i = t - maxPages; i < t + 1; i++) {
                        pages.push({
                            num: i
                        });
                    }
                } else {
                    if (t - p <= 2 * maxPages + 1) {
                        for (var i = 1; i < 2 * maxPages; i++) {
                            pages.push({
                                num: i
                            });
                        }
                        pages.push({
                            num: "..."
                        });
                        for (var i = p - maxPages; i < t + 1; i++) {
                            pages.push({
                                num: i
                            });
                        }
                    } else {
                        for (var i = 1; i < maxPages; i++) {
                            pages.push({
                                num: i
                            });
                        }
                        pages.push({
                            num: "..."
                        });
                        for (var i = p - maxPages; i < p + maxPages; i++) {
                            pages.push({
                                num: i
                            });
                        }
                        pages.push({
                            num: "..."
                        });
                        for (var i = t - maxPages; i < t + 1; i++) {
                            pages.push({
                                num: i
                            });
                        }
                    }
                }
            }
            self.pages(pages);
        }

        self.submitOrder = function() {
            // Check contacts
            var errors = "";
            var fullname = $.trim($('#fullname').val());
            if (fullname.length == 0) {
                errors += "Введите свое имя; ";
            }
            var phone = $.trim($('#phone').val());
            if (phone.length == 0) {
                errors += "Введите свой телефон; ";
            }
            var email = $.trim($('#email').val());
            if (email.length == 0) {
                errors += "Введите свой email; ";
            }
            var address = $.trim($('#address').val());
            if (address.length == 0) {
                errors += "Введите свой адрес; ";
            }
            var comment = $.trim($('#comment').val());
            if (self.batch().length == 0) {
                errors += "Ваша корзина пуста; ";
            }
            if (self.batch().length == 0) {
                errors += "Ваша корзина пуста; ";
            }
            if (!self.selectedDelivery()) {
                errors += "Выберите способ доставки; ";
            }
            self.contactsError(errors);
            if (errors.length == 0) {
                var orderObj = {
                    partner: self.partnerRef,
                    develop: 1
                };
                orderObj.contacts = {
                    phone: phone,
                    email: email,
                    fullname: fullname,
                    address: address,
                    message: comment
                };
                orderObj.delivery = {
                    type: self.selectedDelivery().name,
                    city: self.cityName()
                }
                if (self.selectedArea()) {
                    orderObj.delivery.city_id = self.selectedArea().city_id;
                }
                orderObj.batch = new Array();
                var btch = self.batch();
                for (var i = 0; i < btch.length; i++) {
                    if (btch[i].maket) {
                        orderObj.batch.push({
                            id: btch[i].id,
                            count: btch[i].buyCount().count
                        });
                    } else {
                        orderObj.batch.push({
                            product_id: btch[i].id,
                            count: btch[i].buyCount().count
                        });
                    }
                }
                callJsonpApi("/make_order/jsonp?tmp=1", function(data) {
                    if (data && data.data) {
                        self.lastOrderId(data.data.order);
                        self.batch(null);
                        $(".content-popup").hide();
                        $(".body-over").show();
                        $("#thanksPopup").show();
                    }
                }, orderObj);
            }
        }

        self.removeFromBatch = function(obj) {
            var batch = self.batch();
            var newBatch = new Array();
            for (var i = 0; i < batch.length; i++) {
                if (batch[i].id != obj.id) {
                    newBatch.push(batch[i]);
                }
            }
            self.batch(newBatch);
        }

        self.addToBatch = function(obj) {
            var batch = self.batch();
            var isNewObj = true;
            for (var i = 0; i < batch.length; i++) {
                if (batch[i].id == obj.id) {
                    isNewObj = false;
                    batch[i] = obj;
                }
            }
            if (isNewObj) {
                self.batch.push(obj);
            } else {
                self.batch(batch);
            }
            $('.cart-popup').show();
            $(document.body).animate({
                'scrollTop': $('#topPanelDiv').offset().top
            }, 1000);
        }

        // load data
        callJsonpApi("/get_categories/jsonp?tmp=1", function(data) {
            if (data && data.status) {
                for (var i = 0; i < data.data.length; i++) {
                    for (var j = 0; j < data.data[i].products.length; j++) {
                        for (var k = 0; k < selectedProducts.length; k++) {
                            if (selectedProducts[k].alias == data.data[i].products[j].alias) {
                                selectedProducts[k].id = data.data[i].products[j].id;
                            }
                        }
                    }
                }
                self.menu(selectedProducts);
                self.showCatalog(selectedProducts[0]);
            }
        });

        callJsonpApi("/get_products/jsonp?tmp=1", function(data) {
            if (data && data.status) {
                for (var i = 0; i < data.data.length; i++) {
                    for (var j = 0; j < data.data[i].products.length; j++) {
                        data.data[i].products[j].buyCount = ko.observable(data.data[i].products[j].cost[0]);
                        data.data[i].products[j].buyCost = ko.computed(function() {
                            var bc = this.buyCount();
                            return bc ? bc.cost : 0;
                        }, data.data[i].products[j]);
                    }
                }
                self.products(data.data);
            }
        });
    }
var dmVm = null;
$(document).ready(function() {
    dmVm = new DemoViewModel();
    ko.applyBindings(dmVm);
});