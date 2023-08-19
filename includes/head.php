    <meta charset="utf-8">
    <meta name="author" content="Robin Krambröckers">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

<!--<meta charset="UTF-8">-->
<!--<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">-->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="EcoBots">
    <meta property="og:image" content="/logos/apple-touch-icon.jpg">
    <!-- Fav Icon  -->
    <link rel="shortcut icon" href="/assets/favicon/favicon.ico">
    <!--<link rel="shortcut icon" type="image/x-icon" href="images/favicon.png">-->
    <link rel="icon" href="/assets/favicon/favicon.ico" sizes="32x32">
    <link rel="icon" href="/assets/favicon/favicon.ico" sizes="192x192">
    <link rel="apple-touch-icon-precomposed" href="/logos/apple-touch-icon.jpg">
    <meta name="msapplication-TileImage" content="/assets/favicon/favicon.ico">


    <script>
        window.scrollOffsetFunction = function() {
            var navElements = document.getElementsByClassName("c-navbar");
            if (typeof navElements[0] !== "undefined") {
                var navRect = navElements[0].getBoundingClientRect();
                var navStyle = getComputedStyle(navElements[0]);
                if (navStyle.position === "sticky" || navStyle.position === "fixed") {
                    return navRect.bottom - navRect.top + 30;
                }
            }
            return 0;
        }

    </script>
    
    <link rel="preload" as="style" href="assets/dist/css/main.0da374f4440526d1630a13c1f3e59412ce308fb74066b73d0f8c21715cfe36ac.css">
    <link rel="stylesheet" href="assets/dist/css/main.0da374f4440526d1630a13c1f3e59412ce308fb74066b73d0f8c21715cfe36ac.css">
    
    <script src="assets/dist/js/icons.js"></script>