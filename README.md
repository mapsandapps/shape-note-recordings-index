# Shape Note Recordings Index

```sh
npm install
npm run dev
```

## 💽 Database

Currently using Astro DB, and currently all data is getting imported via db/seed.ts.

## 🧑🏻‍💻 Workflow for Getting New Data

### Nathan's Archive.org Recordings

- Add or uncomment `pullNewData()` in pull-data.astro
- Visit http://localhost:4321/pull-data, which will run that function
- View "known problems" on the pending page
- Correct problems in the pending json file
- Change all statuses in the pending json file to "CONFIRMED"
- Remove the string '-pending' from the json file name
- The next time the app builds, all the new data will be included automatically
- Rebuild the app and commit the new file now

### Bandcamp "Album"

- Change pull-data.astro to make a call to `pullOneBandcampItem()` with the relevant items
- Visit http://localhost:4321/pull-data, which will run that function
- You will be redirected to http://localhost:4321/pending
- Remove or comment out the change to pending.astro
- Visit http://localhost:4321/pending again and the new data should be there
- Follow the remaining steps as above
