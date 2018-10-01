# GUI Release Process

This document outlines the process of creating a distribution archive of the
Juju GUI.

### Prepare for the Release

Clone a fresh copy from the root repo. Do not attempt a release in your current
working repository as the following commands expect a fresh clone.
Make the clone using:

```bash
git clone git@github.com:juju/juju-gui.git juju-gui-release
cd juju-gui-release
```

The CHANGELOG.md should have been kept up to date but you'll want to review it,
and the list of merge commit messages, to make sure nothing was missed.

```bash
git log `git describe --tags --abbrev=0`..HEAD --format='- %b' --merges | sed '/^- $/d'
```

Change `[Unreleased]` to the next semver version and date it following the
existing format.

Commit the changes to the changelog.

```bash
git commit -am "Updated changelog."
```

Now checkout master and merge in develop.

```bash
git checkout master
git merge develop
```

Increment the version number using the ``make bumpversion`` target.  If you
are incrementing the patch (major.minor.patch) number then that's all you need
to do, otherwise invoke it as, e.g., ``VPART=minor make bumpversion``.  Note
that the ``bumpversion`` command will increment the version and do a ``git
commit`` so you'll need to ensure your ``user.name`` and ``user.email`` are set
properly first.

```bash
 make bumpversion
 or
 VPART=minor make bumpversion
 or
 VPART=major make bumpversion
```

It is possible that bumpversion will change strings other than the ones we
intend.  Have a quick look at the diff and ensure nothing untoward got
changed.

```bash
git diff HEAD~1
```

### Test & QA the release

##### Run the full test suite
```bash
make check
```

##### Test JAAS integration with GUIProxy

```bash
make run
guiproxy -env prod
```

##### Test Juju controller integration with a new dist

```bash
make dist
juju bootstrap google google
juju upgrade-gui dist/jujugui-*.tar.bz2
```

### Push to GitHub

```bash
git commit -am "Update package.lock."
git push --tags origin master
```

### Sync development branch

```bash
git checkout develop
git merge master
git push origin develop
```

### Create a release on GitHub

You can find the release on github at
https://github.com/juju/juju-gui/releases/tag/<the newest tag>. Update the
release notes with the entry from CHANGELOG.md and upload the
dist/jujugui-x.tar.bz2 package as a binary.

Congratulations! You've created a release of the Juju GUI.


### Announce the new release on discourse

Create a new topic at https://discourse.jujucharms.com, use the news category,
include release notes and instructions on how to upgrade controllers.

### Roll out to production

Now that the dist has been created JAAS and SimpleStreams will need to be updated
with it. Follow those docs for detailed instructions on their processes.
