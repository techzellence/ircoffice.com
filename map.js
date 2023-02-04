function initMap() {
  const leanGreen = { lat: 44.948306738076035, lng: -93.27877182892344 };
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 19,
    center: leanGreen,
    mapTypeControl: false,
  });
  const GoogleMapApiKey = process.env.GOOGLEMAP_API_KEY;
  const address = "1 W Lake St suite #165, Minneapolis, MN 55408, United States";
  const image = "./img/marker-icon.png";
  const contentString =
`
    
      <div class="store-info-window">
        <div class="store-info-name">
          Immigrant Resource Center
        </div>
        <div class="store-info-status">
          Open From 9AM TO 6PM<br/>(Except Sunday)
        </div>

        <a class="portal" href="https://maps.googleapis.com/maps/api/js?key=${GoogleMapApiKey}&callback=initMap" target="_blank">
        <div  class="store-info-address">
          <div class="circle">
            <img class="logo-location" src="https://uploads-ssl.webflow.com/5f9986f433fe7b863804586b/5fc0306c2d07ef3ee3bc9569_Location.svg" alt="">

          </div>
          1 W Lake St suite #165, Minneapolis,<br/> MN 55408, United States
        </div>

        </a>
        <div  class="store-info-phone">
          <div class="circle">
            <img class="logo-phone" src="https://uploads-ssl.webflow.com/5f9986f433fe7b863804586b/5fc0306c0af8906f1c0b1476_User.svg" alt="">
          </div>
          <a href="tel:(612) 822-5747" runtime_url="tel:(612) 822-5747"><b>(612) 822-5747</b></a>
        </div>

      </div>
    
    `;
  const infowindow = new google.maps.InfoWindow({
    content: contentString,
  });
  const marker = new google.maps.Marker({
    position: leanGreen,
    map,
    title: "Immigrant Resource Center",
    icon: image,
  });
  marker.addListener("click", () => {
    infowindow.open(map, marker);
  });
}
