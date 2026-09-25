console.log("We are inside client.js");

/* On page load */
window.onload = function () {
  const planetInput = document.getElementById("planetID");
  const planet_id = planetInput ? planetInput.value : "";
  console.log("onLoad - Request Planet ID - " + planet_id);

  fetch("/os", {
    method: "GET",
  })
    .then(function (res) {
      if (res.ok) {
        return res.json();
      }
      throw new Error("Request failed"); // Fixed missing space typo
    })
    .then(function (data) {
      const hostnameEl = document.getElementById("hostname");
      if (hostnameEl) {
        hostnameEl.innerHTML = `Pod - ${data.os} `;
      }
    })
    .catch(function (error) {
      console.error("Failed to load OS/Hostname info:", error);
    });
};

const btn = document.getElementById("submit");
if (btn) {
  btn.addEventListener("click", func);
}

function func() {
  const planetInput = document.getElementById("planetID");
  if (!planetInput) return;

  const planet_id = planetInput.value;
  console.log("onClick Submit - Request Planet ID - " + planet_id);

  fetch("/planet", {
    method: "POST",
    body: JSON.stringify({
      id: Number(planet_id), // Ensures it passes as a standard number type
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  })
    .then(function (res2) {
      if (res2.ok) {
        return res2.json();
      }
      throw new Error("Request failed."); // Fixed missing space typo
    })
    .then(function (data) {
      // Validation check: If database collection is empty or planet id is wrong
      if (!data || !data.name) {
        alert(
          "Planet record not found!\nMake sure your Docker space_db has been seeded with data.",
        );
        return;
      }

      // Render Planet Name
      const nameEl = document.getElementById("planetName");
      if (nameEl) nameEl.innerHTML = ` ${data.name} `;

      // Render Planet Image
      const element = document.getElementById("planetImage");
      if (element) {
        const image = ` ${data.image} `;
        element.style.backgroundImage = "url(" + image.trim() + ")";
      }

      // Render formatted description
      const descEl = document.getElementById("planetDescription");
      if (descEl) {
        const planet_description = ` ${data.description} `;
        descEl.innerHTML = planet_description.replace(/(.{80})/g, "\$1<br>");
      }
    })
    .catch(function (error) {
      alert("Ooops, We have 8 planets.\nSelect a number from 0 - 8");
      console.error("Frontend query exception:", error);
    });
}
