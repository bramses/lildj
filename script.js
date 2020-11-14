let loadingAnim = document.getElementById("loadingAnimation");
loadingAnim.style.display = "none";
document.getElementById("submitBtn").addEventListener("click", populatePrompt);
const result = document.getElementById("result");
const sendAPIButton = document.getElementById("sendToAPI");

document.getElementById("inputGPT").style.height = "200px";
document.getElementById("inputGPT").style.fontSize = "48pt";

let gptString = "";
let seedTracks = [];

sendAPIButton.addEventListener("click", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const myParam = urlParams.get("code");
  console.log(myParam);
  console.log({
    message: myParam,
    gptString: gptString,
    seedTracks: seedTracks,
  });
  // fetch('http://localhost:5000/spotify-workflow', {
  //   method: "POST",
  //     mode: "cors",
  //     credentials: "same-origin",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       message: myParam,
  //       gptString: gptString,
  //       seedTracks: seedTracks
  //     }),
  // })
});

async function populatePrompt() {
  const command = `Create a three song playlist based off of a mood.\n  \n Mood: I'm off to the beach\n\nSongs:  \n\n1. Dirty Heads - Bum Bum\n  \n  2. Ballyhoo! - Message to the World\n  \n  3. SOJA - Things You Can't Control\n\nMood: It's a rainy day and I want uplifting music\n\nSongs: \n\n1. The 1975 - The Sound\n\n2. Queens of the Stone Age - The Way You Used to Do\n\n3. OneRepublic - The Good Life`;

  const inputGPT = document.getElementById("inputGPT").value;
  gptString = inputGPT; // set global
  const prompt = `${command}\n\n Mood: ${inputGPT}\n\nSongs:`;

  loadingAnim.style.display = "block";
  await workflow(prompt);
  // const response = await getAIResponse(prompt);
  // result.innerHTML = `Response: ${response}`;
  // console.log(response);
}

async function getAIResponse(prompt) {
  try {
    const res = await fetch("http://localhost:5000/get-message", {
      method: "POST",
      mode: "cors",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
      }),
    });

    // loadingAnim.style.display = "none";
    const completion = await res.json();
    return completion.choices[0].text;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function cleanResponse(response) {
  const seedTracks = [];
  response = response.replace("Response:", "");
  const splitStr = response.split("\n");
  for (let i = 0; i < splitStr.length; i++) {
    let trimmedThing = splitStr[i];
    trimmedThing = trimmedThing.replace("1. ", "").trim();
    trimmedThing = trimmedThing.replace("2. ", "").trim();
    trimmedThing = trimmedThing.replace("3. ", "").trim();

    if (trimmedThing.length > 1) seedTracks.push(trimmedThing);
  }

  return seedTracks;
}

// need to be signed in (code in query string)
async function workflow(prompt) {
  const response = await getAIResponse(prompt);
  console.log(response);
  const urlParams = new URLSearchParams(window.location.search);
  const myParam = urlParams.get("code");
  const seedTracks = cleanResponse(response);

  const res = await fetch("http://localhost:5000/spotify-workflow", {
    method: "POST",
    mode: "cors",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: myParam,
      gptString: gptString,
      seedTracks: seedTracks,
    }),
  });

  const data = await res.json();

  loadingAnim.style.display = "none";

  const playlistName = document.getElementById("playlistName");
  const playlistPic = document.getElementById("playlistPic");
  const playlistLink = document.getElementById("playlistLink");

  playlistName.innerHTML = data.name;
  playlistPic.width = "240";
  playlistPic.height = "240";
  playlistPic.src = data.image.url;
  playlistLink.href = data.link;
  playlistLink.innerHTML = "Link to Playlist";
}
