# Simple Media

A lightweight media management system for organizing TV shows, movies, and books.

## Screenshots

### Dashboard

![Dashboard Screenshot](docs/dashboard-screenshot.png)

### Movie Details

![Movie Details Screenshot](docs/movie-details.png)

### TV Show Details
![TV Show Details Screenshot](docs/tv-shows.png)

### Episode Details

![Episode Details Screenshot](docs/episode-details.png)



## Overview

The overall goal of this project is to create a way to manage media, in a 'lighter' way, the arr stack feels very bulky
I understand the need for seperation at times, but I do not understand the need for a different app and setup solely for
a different type of media.

## Features

### Media Management

- **TV Shows**: Automatic metadata fetching from TVDB, episode tracking, season organization
- **Movies**: TMDB integration for posters, descriptions, and ratings
- **Books**: Support for ebooks and audiobooks organized by author and series

### Metadata

- Manual metadata refresh per item or bulk operations
- Clear and re-fetch metadata when needed
- Local metadata caching to reduce API calls
- Poster/cover art display

### Scanning

- Real-time scan progress with visual indicators on grid items
- Individual or full library scans
- File system monitoring for new media

### Media Details

- Episode-level viewing for TV shows with TVDB metadata integration
- Season and episode organization
- Play/download links (when paths are accessible)

### Settings

- TVDB and TMDB API key configuration
- Library path management for TV, movies, and books
- Bulk metadata operations
- Test API connectivity

## Current Goal

Currently this is basically a glorified media scanner with metadata fetching and a frontend to view the media. my goal is
to be able to write this data to the files media files and cleanup the library structure after scanning and fetching metadata.

## Current Goal TLDR

- determine tech stack, setup docker container pipeline, get webpage on localhost.

## Notes

- I want this to be light, I'm not going to plan for hosting 500million users and have the most segmented backend
- I want it to be modular, the first media I want to work on will be books. This will come after step 1

## Tech stack

### Frontend

- React + Typescript + Vite
- Tailwind CSS

### Backend

- Node.js + Typescript

### Database

- SQLite

### Containerization

- Docker + Docker Compose
