'use strict';

const {src, dest, watch, series, parallel} = require('gulp');
const browserSync = require('browser-sync').create();
const del = require('del');
const eslint = require('gulp-eslint7');
const inlinesource = require('gulp-inline-source');
const sass = require('gulp-sass')(require('sass'));
const stylelint = require('gulp-stylelint');
const uglify = require('gulp-uglify-es');

// File paths
const paths = {
  dist: './docs',
  src: './src',
  tmp: './tmp'
}

const files = {
  html: paths.src + '/index.html',
  js: paths.src + '/script.js',
  scss: paths.src + '/style.scss'
}

// Clean temp directory before and after build
const cleanTmp = () => {
  return del(paths.tmp);
};

// Build CSS from source
const buildCSS = () => {
  return src(files.scss)
    .pipe(stylelint({
      reporters: [
        {
          console: true,
          formatter: 'string'
        }
      ]
    }))
    .pipe(sass({
        outputStyle: 'compressed'
    }))
    .pipe(dest(paths.tmp))
};

// Build JS from source
const buildJS = () => {
  return src(files.js)
    .pipe(eslint())
    .pipe(uglify.default({
        compress: {
            arguments: true,
            booleans_as_integers: true
        }
    }))
    .pipe(dest(paths.tmp))
};

// Build HTML from source and inject assets
const buildHTML = () => {
  return src(files.html)
    .pipe(inlinesource())
    .pipe(dest(paths.dist));
};

// Dev functions
const startWatch = () => {
  const watchSeries = series(
    parallel(buildCSS, buildJS),
    buildHTML,
    cleanTmp
  );

  watch(files.scss, watchSeries);
  watch(files.js, watchSeries);
  watch(files.html, watchSeries);
};

const serve = () => {
  browserSync.init({
    open: true,
    server: {
      baseDir: paths.dist
    }
  });

  watch(paths.dist + '/index.html')
    .on('change', browserSync.reload);
};

// Tasks
exports.default = series(
  cleanTmp,
  parallel(buildCSS, buildJS),
  buildHTML,
  cleanTmp
);

exports.dev = series(
  parallel(buildCSS, buildJS),
  buildHTML,
  cleanTmp,
  parallel(serve, startWatch)
);
