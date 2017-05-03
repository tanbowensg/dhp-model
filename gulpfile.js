const gulp = require('gulp');
const babel = require('gulp-babel');
const del = require('del');
const webpackStream = require('webpack-stream');
const webpack2 = require('webpack');
const path = require('path');
const fs = require('fs');

const nodeModules = {};
fs.readdirSync('node_modules')
  .filter(x => {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(mod => {
    nodeModules[mod] = `commonjs ${mod}`;
  });

gulp.task('clean', () => {
  return del(['dist']);
});

gulp.task('cleanbuild', () => {
  return del(['build']);
});

gulp.task('babel', ['clean'], () => {
  return gulp.src(['./app/**/*.js'])
    .pipe(babel({
      presets: ['es2015'],
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('webpack', ['babel', 'cleanbuild'], () => {
  return gulp.src(['./dist/index.js'])
    .pipe(webpackStream({
      output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
      },
      target: 'node',
      externals: nodeModules,
    }, webpack2))
    .pipe(gulp.dest('build'));
});

gulp.task('watch', ['babel'], () => {
  gulp.watch(['./app/**/*.js'], ['babel']);
});
