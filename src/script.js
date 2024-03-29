'use strict';

let locations, openingHours, geoLocation;

let dropdown = document.getElementById('stores');
dropdown.length = 0;

let defaultOption = document.createElement('option');
defaultOption.innerHTML = '- Select Store &#x21B4;';
defaultOption.value = '';

dropdown.add(defaultOption);
dropdown.selectedIndex = 0;

dropdown.addEventListener('change', e => {
  const that = e.target;

  if (that.value.length) {
    const s = str => {
        return str.toString().substring(0, 9);
    }
    
    let mapsUrl = `https://classic-maps.openrouteservice.org/directions?n3=13&c=0&a=`;

    if (!typeof geoLocation !== 'undefined') {
        mapsUrl += `${s(geoLocation.coords.latitude)},${s(geoLocation.coords.longitude)},${s(locations[that.value]['lat'])},${s(locations[that.value]['lon'])}`;
    } else {
        mapsUrl += `null,null,${s(locations[that.value]['lat'])},${s(locations[that.value]['lon'])}`;
    }

    document.getElementById('store-number').textContent = `${document.getElementById('countries').value}-${that.value}`;
    document.getElementById('store-location').href = mapsUrl;
    document.getElementById('info').removeAttribute('hidden');

    drawOpeningHoursTable(that.value);
    drawStoreStatus(that.value);
  } else {
    document.getElementById('info').setAttribute('hidden', '1');
  }
});

// Location related stuff
const closestLocation = (targetLocation, locationData) => {
  const vectorDistance = (dx, dy) => {
    return Math.sqrt(dx * dx + dy * dy);
  };

  const locationDistance = (location1, location2) => {
    let dx = location1.coords.latitude - location2['location']['lat'],
      dy = location1.coords.longitude - location2['location']['lon'];

    return vectorDistance(dx, dy);
  };

  return locationData.reduce((prev, curr) => {
    let prevDistance = locationDistance(targetLocation, prev),
      currDistance = locationDistance(targetLocation, curr);

    return prevDistance < currDistance ? prev : curr;
  });
};

// opening hours related stuff
const drawOpeningHoursTable = async storeNumber => {
  const table = document.getElementById('opening-hours'),
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let tr, th, td, data;

  table.innerHTML = null;

  if (undefined !== openingHours[storeNumber]) {
    for (let i = 0; i < openingHours[storeNumber].length; i += 1) {
      data = openingHours[storeNumber][i];

      tr = document.createElement('tr');

      th = document.createElement('th');
      th.textContent = days[data['weekDay'] - 1];
      tr.appendChild(th);

      td = document.createElement('td');
      td.textContent = `${data['timeRanges'][0]['opening']} - ${data['timeRanges'][0]['closing']}`;
      tr.appendChild(td);

      table.appendChild(tr);
    }
  }
};

const drawStoreStatus = async storeNumber => {
  const status = document.getElementById('store-status'),
    d = new Date(),
    n = d.getDay(),
    now = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()}`,
    day = openingHours[storeNumber].filter(e => {
      return e['weekDay'] === n;
    });

  if (undefined !== day[0]) {
    if (now >= day[0]['timeRanges'][0]['opening'] && now < day[0]['timeRanges'][0]['closing']) {
      status.innerText = 'Open';
      status.classList.add('green');
    } else {
      status.innerText = 'Closed';
      status.classList.add('red');
    }
  } else {
    status.innerText = 'Closed';
    status.classList.add('red');
  }
};

const fetchData = async countryCode => {
  const url = `data/dm-stores-${countryCode}.json?cb=${new Date().toISOString().slice(0, 10)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const message = `An error has occured: ${response.status}`;
    throw new Error(message);
  }

  return await response.json();
}

// perform magic after selecting a country
document.getElementById('countries').addEventListener('change', e => {
  const that = e.target;

  // reset
  document.getElementById('info').setAttribute('hidden', '1');
  dropdown.setAttribute('hidden', '1');

  for (let i = dropdown.options.length - 1; i >= 0; i -= 1) {
    if (dropdown.options[i].value.length) {
      dropdown.options[i] = null;
    }
  }

  if (!that.value.length) {
    return;
  } else {
    dropdown.removeAttribute('hidden');
  }

  // parse data for the selected country
  fetchData(that.value)
    .then(data => {
      let option, address, storeNumber;

      openingHours = [];
      locations = [];

      // order stores by zip
      data.sort((a, b) => a.address['zip'].replaceAll(' ', '') - b.address['zip'].replaceAll(' ', ''));

      // build dropdown options, based on the JSON data
      for (let i = 0; i < data.length; i += 1) {
        address = data[i].address;
        storeNumber = parseInt(data[i]['storeNumber'], 10);

        option = document.createElement('option');
        option.text = `${address['zip']} ${address['city']} - ${address['street']}`;
        option.value = storeNumber;

        dropdown.add(option);

        openingHours[storeNumber] = data[i]['openingHours'];
        locations[storeNumber] = data[i]['location'];
      }

      // select nearest store next to visitors location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const targetLocation = pos;
          geoLocation = pos;

          if (undefined !== targetLocation) {
            const selected = parseInt(closestLocation(targetLocation, data)['storeNumber'], 10);

            dropdown.querySelector(`option[value="${selected}"]`).selected = true;

            // trigger change
            dropdown.dispatchEvent(new CustomEvent('change'));
          }
        });
      }
    })
    .catch(err => console.error('Fetch Error -', err));
});
