var SpotifyWebApi = require("spotify-web-api-node");
require("dotenv").config();

const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

const scopes = [
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-private",
  "user-read-private",
  "user-read-email",
];
const state = "some-state";
const spotifyApi = new SpotifyWebApi({
  clientId: clientID,
  clientSecret: clientSecret,
  redirectUri: "http://localhost:8000/",
});

const generateAuthURL = () => {
  // Create the authorization URL
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  return authorizeURL;
};

// run this to get a url for a new auth url for frontend
// generateAuthURL();

const fetchAccessToken = async (userCode = "") => {
  try {
    if (userCode.length == 0) {
      // Retrieve an access token
      const data = await spotifyApi.clientCredentialsGrant();
      // console.log("The access token expires in " + data.body["expires_in"]);
      // console.log("The access token is " + data.body["access_token"]);
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body["access_token"]);
      console.log("The token expires in " + data.body["expires_in"]);
      console.log("The access token is " + data.body["access_token"]);
      console.log("The refresh token is " + data.body["refresh_token"]);
    } else {
      const data = await spotifyApi.authorizationCodeGrant(userCode);
      console.log("USER -- The token expires in " + data.body["expires_in"]);
      console.log("USER -- The access token is " + data.body["access_token"]);
      console.log("USER -- The refresh token is " + data.body["refresh_token"]);

      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body["access_token"]);
      spotifyApi.setRefreshToken(data.body["refresh_token"]);
    }
  } catch (error) {
    console.log(
      "Something went wrong when retrieving an access token",
      error.message
    );
  }
};

const refreshAccessToken = async () => {
  const data = await spotifyApi.refreshAccessToken();
  console.log("The access token has been refreshed!");

  // Save the access token so that it's used in future calls
  spotifyApi.setAccessToken(data.body["access_token"]);
};

/**
 * USER AUTH REQUIRED => SEE EXPRESS /spotify-workflow and index.html:signinlink FOR LOGIN
 */
const addSongsToPlaylist = async (playlistID, tracks) => {
  try {
    console.log(`adding ${tracks.length} songs to playlist ID: ${playlistID}`)
    const playlist = await spotifyApi.addTracksToPlaylist(playlistID, tracks);
    return playlist.body.snapshot_id;
  } catch (error) {
    console.error(error);
  }
};

/**
 * USER AUTH REQUIRED => SEE EXPRESS /spotify-workflow and index.html:signinlink FOR LOGIN
 */
const createEmptyPlaylist = async (gptString, authToken) => {
  // Create a private playlist
  try {
    console.log(`creating empty playlist with string: ${gptString}`)
    await fetchAccessToken(authToken); // get token first
    const playlist = await spotifyApi.createPlaylist(gptString, {
      description: "",
      public: true,
    });
    return playlist.body.id;
  } catch (error) {
    console.error(error);
  }
};

const getPlaylistData = async (id = "") => {
  try {
    console.log(`fetching playlist: ${id}`)
    await fetchAccessToken(""); // get token first
    const data = await spotifyApi.getPlaylist(id)
    
    return { link: data.body.external_urls.spotify, image: data.body.images[0], name: data.body.name }
  } catch (error) {
    console.error(error)
  }
} 

const findSeedTracks = async (songs = []) => {
  try {
    console.log(`searching for seed tracks: ${songs}`)
    await fetchAccessToken(""); // get token first
    const trackIDs = [];
    for (let i = 0; i < songs.length; i++) {
      const song = await spotifyApi.searchTracks(songs[i]);
      if (song.body.tracks.total > 0) {
        console.log(song.body.tracks.items[0].album.images[0])
        const trackID = song.body.tracks.items[0].uri;
        trackIDs.push(trackID);
      } else {
        console.error(`Could not find  any song with q = ${songs[i]}`);
      }
    }

    return trackIDs;
  } catch (error) {
    console.error(error);
  }
};

// findSeedTracks(['redbone'])

const generateRecommendations = async (seedTracks = []) => {
  try {
    console.log(`generating recommendations for seed tracks: ${seedTracks}`)
    const allTracks = seedTracks
    await fetchAccessToken("");
    const cleanedSeedTracks = seedTracks.map(seedTrack => seedTrack.replace('spotify:track:', ''))
    const recs = await spotifyApi.getRecommendations({
      seed_tracks: cleanedSeedTracks,
    });
    const uris = recs.body.tracks.map((track) => track.uri)
    allTracks.push(uris);
    return allTracks.flat()
  } catch (error) {
    console.error(error);
  }
};

const seedTracks = [
  "Bum Bum - Dirty Heads",
  "Message to the World - Ballyhoo!",
  "Pain - Three Days Grace",
];

// (async () => generateRecommendations(await findSeedTracks(seedTracks)))()

const workflow = async (gptString, seedTracks, authToken) => {
  try {
    console.log(`starting workflow`)
    const playlistID = await createEmptyPlaylist(gptString, authToken);
    const seedIDs = await findSeedTracks(seedTracks);
    const trackIDs = await generateRecommendations(seedIDs);
    await refreshAccessToken()
    const snapshotPlaylistID = await addSongsToPlaylist(
      playlistID,
      trackIDs);
    
    const playlistData = await getPlaylistData(playlistID)
    return playlistData
  } catch (error) {
    console.error(error);
  }
};

// createEmptyPlaylist('Getting a milkshake with my girlfriend')

module.exports = { workflow };
