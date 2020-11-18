'use strict';

let locations, openingHours;

let dropdown = document.getElementById('stores');
dropdown.length = 0;

let defaultOption = document.createElement('option');
defaultOption.text = '- Select Store ↴';
defaultOption.value = '';

dropdown.add(defaultOption);
dropdown.selectedIndex = 0;

dropdown.addEventListener('change', e => {
  const that = e.target;

  if (that.value.length) {
    document.getElementById('store-number').textContent = `${document.getElementById('countries').value}-${that.value}`;
    document.getElementById('store-location').href = `https://www.openstreetmap.org/?mlat=${locations[that.value]['lat']}&mlon=${locations[that.value]['lon']}&zoom=17`;
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
const drawOpeningHoursTable = storeNumber => {
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

const drawStoreStatus = storeNumber => {
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

// perform magic after selecting a country
document.getElementById('countries').addEventListener('change', e => {
  const that = e.target,
    url = `data/dm-stores-${that.value}.json?cb=${new Date().toISOString().slice(0, 10)}`;

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

  fetch(url)
    .then(response => {
      if (response.status !== 200) {
        console.warn(`Looks like there was a problem. Status Code:${response.status}`);

        return;
      }

      // examine the text in the response
      response.json().then(data => {
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

              if (undefined !== targetLocation) {
                const selected = parseInt(closestLocation(targetLocation, data)['storeNumber'], 10);

                dropdown.querySelector(`option[value="${selected}"]`).selected = true;

                // trigger change
                dropdown.dispatchEvent(new CustomEvent('change'));
              }
            },
            null,
            {
              enableHighAccuracy: true,
              maximumAge: 0
            }
          );
        }
      });
    })
    .catch(err => console.error('Fetch Error -', err));
});
