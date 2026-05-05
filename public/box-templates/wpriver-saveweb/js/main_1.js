$(window).on('elementor/frontend/init',function(){
        elementorFrontend.hooks.addAction('frontend/element_ready/services.default',function(scope,$){
            $(scope).find('.owl-carousel').each(function() {
            $('.services-carousel').owlCarousel({
            loop: false,
            margin: 30,
            nav: false,
            navText: [
                "<i class='fa fa-angle-left'></i>",
                "<i class='fa fa-angle-right'></i>"
            ],
            dots: true,
            autoplay: true,
            responsive: {
                0: {
                    items: 1
                },
                800: {
                    items: 2
                },
                1000: {
                    items: 3,
                }
            }
        });
            });
        });
    });
