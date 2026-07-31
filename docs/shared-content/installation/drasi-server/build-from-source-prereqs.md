Building `drasi-server` requires several native C libraries. Install the dependencies for your platform:


#### macOS

Install Xcode Command Line Tools to get `clang` and `perl`.

Then install the remaining dependencies with Homebrew:

```bash {#macos-native-deps}
brew install protobuf jq oniguruma
```

The build links against `libjq`, but the `jq-sys` crate cannot locate the Homebrew copy automatically and the build fails with `Unable to find libjq` unless you tell it where the library is. Set `JQ_LIB_DIR` in the same terminal you build from (add it to your shell profile to make it permanent):

```bash {#macos-jq-lib-dir}
export JQ_LIB_DIR="$(brew --prefix jq)/lib"
```

#### Debian / Ubuntu

`perl` is pre-installed. Install everything else with:

```bash {#linux-native-deps}
sudo apt-get install -y libssl-dev pkg-config clang libclang-dev libjq-dev libonig-dev protobuf-compiler 
```

#### Windows

Building natively on Windows requires the Visual Studio 2022 Build Tools (for the MSVC toolchain):

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e `
    --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Then install the pinned Rust MSVC toolchain:

```powershell
rustup toolchain install 1.95.0-x86_64-pc-windows-msvc
```