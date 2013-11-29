var path = require('path'),
    fs = require('fs-extra'),
    os = require('os'),
    exec = require('child_process').exec;

module.exports = function (grunt) {

    var file = grunt.file;
    var task = grunt.task;
    var pathname = path.basename(__dirname);
    var files = doWalk('./');
    // files.js 存储项目中的所有js文件
    // file.css 存储项目中的所有css文件
    // file.less 存储项目中所有less文件

    // ======================= 配置每个任务 ==========================

    grunt.initConfig({

        pkg          : grunt.file.readJSON('abc.json'),

        // 配置默认分支
        currentBranch: 'master',


        // 对页面进行清理
        clean        : {

            build: {
                src: 'build/*'
            }
        },

        /**
         * 将src目录中的KISSY文件做编译打包，仅做合并，源文件需要指定名称
         *    KISSY.add('package/path/to/file',function(S){});
         *
         *    @link https://github.com/daxingplay/grunt-kmc
         *
         * 如果需要只生成依赖关系表，不做合并
         * 在kmc.options中增加两个参数:
         *    depFilePath: 'build/mods.js',
         *    comboOnly: true,
         *    comboMap: true,
         */
        kmc      : {
            options: {
                packages: [
                    {
                        name   : 'mpi',
                        path   : '../',
                        charset: 'utf-8'
                    }

                ]
            },

            main: {
                files: [
                    {
                        // 这里指定项目根目录下所有文件为入口文件，自定义入口请自行添加
                        expand: true,
                        cwd   : './',
                        src   : [ '**/*.js', '!**/node_modules/**', '!**/build/**', '!**/demo/**', '!**/doc/**', '!**/guide/**', '!**/tests/**', '!Gruntfile.js'],
                        dest  : 'build/'
                    }
                ]
            }
            // 若有新任务，请自行添加
            /*
             "simple-example": {
             files: [
             {
             src: "a.js",
             dest: "build/index.js"
             }
             ]
             }
             */
        },

        // CSS-Combo: 合并项目中所有css，通过@import "other.css" 来处理CSS的依赖关系
        css_combo: {
            options: {
                paths: './'
            },
            main   : {
                files: [
                    {
                        expand: true,
                        cwd   : 'build',
                        src   : ['**/*.css'],
                        dest  : 'build/',
                        ext   : '.css'
                    }
                ]
            }
        },

        // 编译LESS为CSS https://github.com/gruntjs/grunt-contrib-less
        less     : {
            options: {
                paths: './'
            },
            main   : {
                files: [
                    {
                        expand: true,
                        cwd   : 'build/',
                        src   : ['**/*.less'],
                        dest  : 'build/',
                        ext   : '.css'
                    }
                ]
            }
        },

        // 压缩JS https://github.com/gruntjs/grunt-contrib-uglify
        uglify   : {
            options: {
                banner  : '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd hh:MM:ss") %> */\n',
                beautify: {
                    ascii_only: true
                }
            },
            main   : {
                files: [
                    {
                        expand: true,
                        cwd   : 'build/',
                        src   : ['**/*.js', '!**/*-min.js'],
                        dest  : 'build/',
                        ext   : '-min.js'
                    }
                ]
            }
        },

        // 压缩CSS https://github.com/gruntjs/grunt-contrib-cssmin
        cssmin   : {
            main: {
                files: [
                    {
                        expand: true,
                        cwd   : 'build/',
                        src   : ['**/*.css', '!**/*-min.css'],
                        dest  : 'build/',
                        ext   : '-min.css'
                    }
                ]
            }
        },

        // 发布命令
        exec     : {
            tag          : {
                command: 'git tag publish/<%= currentBranch %>'
            },
            publish      : {
                command: 'git push origin publish/<%= currentBranch %>:publish/<%= currentBranch %>'
            },
            commit       : {
                command: 'git commit -m "<%= currentBranch %> - <%= grunt.template.today("yyyy-mm-dd hh:MM:ss") %>"'
            },
            add          : {
                command: 'git add .'
            },
            prepub       : {
                command: 'git push origin daily/<%= currentBranch %>:daily/<%= currentBranch %>'
            },
            grunt_publish: {
                command: 'grunt default:publish'
            },
            grunt_prepub : {
                command: 'grunt default:prepub'
            },
            new_branch   : {
                command: 'git checkout -b daily/<%= currentBranch %>'
            }
        },

        // 拷贝文件
        copy     : {
            main: {
                files: [
                    {
                        // src: files.js,
                        expand: true,
                        src   : ['**/*.html', '**/*.htm', '**/*.js', '**/*.less', '**/*.css', '**/*.png', '**/*.gif', '**/*.jpg', '!**/node_modules/**', '!**/build/', '!**/demo/**', '!**/doc/**', '!**/guide/**', '!**/tests/**', '!Gruntfile.js'],
                        dest  : 'build/',
                        cwd   : './',
                        filter: 'isFile'
                    }
                ]
            }
        },
        // 替换config中的版本号@@version
        replace  : {
            dist: {
                options: {
                    variables: {
                        'version': '<%= pkg.version %>'
                    },
                    prefix   : '@@'
                },
                files  : [
                    {
                        expand: true,
                        cwd   : 'build/',
                        dest  : 'build/',
                        src   : ['**/*']
                    }
                ]
            }
        }

        // 合并文件
        /*
         concat: {
         dist: {
         src: ['from.css'],
         dest: 'build/to.css'

         }
         },
         */

        // YUIDoc: 对build目录中的js文件生成文档，放入doc/中
        /*
         yuidoc: {
         compile: {
         name: 'generator-clam',
         description: 'A Clam generator for Yeoman',
         options: {
         paths: 'build/',
         outdir: 'doc/'
         }
         }
         }
         */

    });

    // ======================= 载入使用到的通过NPM安装的模块 ==========================

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-css-combo');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-kmc');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-replace');

    // 根据需要打开这些配置
    //grunt.loadNpmTasks('grunt-kissy-template');
    //grunt.loadNpmTasks('grunt-contrib-connect');
    //grunt.loadNpmTasks('grunt-contrib-concat');
    //grunt.loadNpmTasks('grunt-contrib-yuidoc');

    // =======================  注册Grunt 各个操作 ==========================

    /**
     * 正式发布
     */
    grunt.registerTask('publish', 'clam publish...', function () {
        task.run('exec:grunt_publish');
    });
    grunt.registerTask('pub', 'clam publish...', function () {
        task.run('exec:grunt_publish');
    });
    grunt.registerTask('build', 'clam publish...', function () {
        //task.run('combohtml');
    });

    /**
     * 预发布
     */
    grunt.registerTask('prepub', 'clam pre publish...', function () {
        task.run('exec:grunt_prepub');
    });


    /*
     * 获取当前库的信息
     **/
    grunt.registerTask('info', 'clam info...', function () {
        var abcJSON = {};
        try {
            abcJSON = require(path.resolve(process.cwd(), 'abc.json'));
            console.log('\n' + abcJSON.repository.url);
        } catch (e) {
            console.log('未找到abc.json');
        }
    });

    /*
     * 获取当前最大版本号，并创建新分支
     **/
    grunt.registerTask('newbranch', 'clam newBranch...', function (type) {
        var done = this.async();
        exec('git branch -a & git tag', function (err, stdout, stderr, cb) {
            var r = getBiggestVersion(stdout.match(/\d+\.\d+\.\d+/ig));
            if (!r) {
                r = '0.0.1';
            } else {
                r[2]++;
                r = r.join('.');
            }
            grunt.log.write(('新分支：daily/' + r).green);
            grunt.config.set('currentBranch', r);
            task.run(['exec:new_branch']);
            // 回写入 abc.json 的 version
            try {
                abcJSON = require(path.resolve(process.cwd(), 'abc.json'));
                abcJSON.version = r;
                fs.writeJSONFile("abc.json", abcJSON, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("update abc.json.");
                    }
                });
            } catch (e) {
                console.log('未找到abc.json');
            }
            done();
        });
    });

    // =======================  注册Grunt主流程  ==========================

    return grunt.registerTask('default', 'clam running ...', function (type) {

        var done = this.async();

        // 获取当前分支
        exec('git branch', function (err, stdout, stderr, cb) {

            var reg = /\*\s+daily\/(\S+)/,
                match = stdout.match(reg);

            if (!match) {
                grunt.log.error('当前分支为 master 或者名字不合法(daily/x.y.z)，请切换到daily分支'.red);
                grunt.log.error('创建新daily分支：grunt newbranch'.yellow);
                return;
            }
            grunt.log.write(('当前分支：' + match[1]).green);
            grunt.config.set('currentBranch', match[1]);
            done();
        });

        // 构建和发布任务
        if (!type) {
            task.run(['clean:build', 'copy', 'less', 'css_combo', 'kmc', 'replace', 'uglify', 'cssmin'/*'concat','yuidoc'*/]);
        } else if ('publish' === type || 'pub' === type) {
            task.run(['exec:tag', 'exec:publish']);
        } else if ('prepub' === type) {
            task.run(['exec:add', 'exec:commit']);
            task.run(['exec:prepub']);
        }

    });

    // =======================  辅助函数  ==========================

    // 遍历当前目录的文件
    function walk(uri, files) {

        var stat = fs.lstatSync(uri);
        if (stat.isFile() && !/(build|node_modules|demo|doc|\.git|\.+)[\\|\/]/i.test(uri) && !/grunt.+/i.test(uri)) {

            switch (path.extname(uri)) {
                case '.css':
                    files.css.push(uri);
                    break;
                case '.js':
                    files.js.push(uri);
                    break;
                case '.less':
                    files.less.push(uri);
                    break;
                case '.scss':
                    files.scss.push(uri);
                    break;
                default:
                    files.other.push(uri);
            }
        }
        if (stat.isDirectory()) {
            fs.readdirSync(uri).forEach(function (part) {
                walk(path.join(uri, part), files);
            });
        }
    }


    // 得到文件结构的数据结构
    function doWalk(rootDir) {
        var files = {
            css  : [],
            less : [],
            scss : [],
            js   : [],
            other: [] // 暂时没用
        };
        walk(rootDir, files);
        return files;
    }

    function getBiggestVersion(A) {
        var a = [];
        var b = [];
        var t = [];
        var r = [];
        if (!A) {
            return [0, 0, 0];
        }
        for (var i = 0; i < A.length; i++) {
            if (A[i].match(/^\d+\.\d+\.\d+$/)) {
                var sp = A[i].split('.');
                a.push([
                    Number(sp[0]), Number(sp[1]), Number(sp[2])
                ]);
            }
        }

        var r = findMax(findMax(findMax(a, 0), 1), 2);
        return r[0];
    }

    // a：二维数组，index，比较第几个
    // return：返回保留比较后的结果组成的二维数组
    function findMax(a, index) {
        var t = [];
        var b = [];
        var r = [];
        for (var i = 0; i < a.length; i++) {
            t.push(Number(a[i][index]));
        }
        var max = Math.max.apply(this, t);
        for (var i = 0; i < a.length; i++) {
            if (a[i][index] === max) {
                b.push(i);
            }
        }
        for (var i = 0; i < b.length; i++) {
            r.push(a[b[i]]);
        }
        return r;
    }
};
